import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Project, PaymentLedger, User, Revision } from '../models';
import { initiateX402Payment, releasePayment, confirmX402Payment } from '../services/coinbase-x402';

const router = Router();

/**
 * POST /api/payments/escrow
 * Deposit funds to escrow when creating a project
 */
router.post('/escrow', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { project_id, amount_usdc } = req.body;

        if (!project_id || !amount_usdc) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['project_id', 'amount_usdc']
            });
            return;
        }

        if (amount_usdc <= 0) {
            res.status(400).json({ error: 'Amount must be greater than 0' });
            return;
        }

        // Find project and verify client owns it
        const project = await Project.findById(project_id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'You do not have permission to deposit to this project' });
            return;
        }

        // Get client wallet address
        const client = await User.findById(req.user!.userId);
        if (!client || !client.wallet_address) {
            res.status(400).json({ error: 'Client wallet not connected. Please link your Coinbase wallet first.' });
            return;
        }

        // Initiate x402 payment to escrow
        // In production, this would handle the actual x402 protocol flow
        const paymentResponse = await initiateX402Payment({
            amount: amount_usdc,
            recipientAddress: process.env.ESCROW_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000', // Escrow wallet
            payerAddress: client.wallet_address,
            projectId: project_id
        });

        // Create ledger entry
        const ledgerEntry = await PaymentLedger.create({
            project_id: project._id,
            transaction_type: 'ESCROW_DEPOSIT',
            amount_usdc,
            x402_stream_id: paymentResponse.streamId,
            x402_facilitator_url: paymentResponse.facilitatorUrl,
            status: paymentResponse.status,
            triggered_by: 'CLIENT_APPROVAL'
        });

        // Update project payment status
        project.payment_status = 'ESCROWED';
        await project.save();

        res.status(201).json({
            message: 'Escrow deposit initiated',
            ledger: ledgerEntry,
            payment: {
                stream_id: paymentResponse.streamId,
                facilitator_url: paymentResponse.facilitatorUrl,
                status: paymentResponse.status
            }
        });
    } catch (error) {
        console.error('Escrow deposit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/payments/release/:revisionId
 * Release milestone payment to freelancer when work is approved
 */
router.post('/release/:revisionId', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { revisionId } = req.params;
        const { amount_usdc } = req.body;

        if (!amount_usdc || amount_usdc <= 0) {
            res.status(400).json({ error: 'Valid amount_usdc is required' });
            return;
        }

        // Find revision and project
        const revision = await Revision.findById(revisionId);
        
        if (!revision) {
            res.status(404).json({ error: 'Revision not found' });
            return;
        }

        const project = await Project.findById(revision.project_id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Verify client owns project
        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'You do not have permission to release payment for this project' });
            return;
        }

        // Verify revision is approved
        if (revision.status !== 'APPROVED') {
            res.status(400).json({ error: 'Revision must be approved before releasing payment' });
            return;
        }

        // Get freelancer and client wallet addresses
        const freelancer = await User.findById(project.freelancer_id);
        const client = await User.findById(req.user!.userId);

        if (!freelancer || !freelancer.wallet_address) {
            res.status(400).json({ error: 'Freelancer wallet not connected' });
            return;
        }

        if (!client || !client.wallet_address) {
            res.status(400).json({ error: 'Client wallet not connected' });
            return;
        }

        // Check sufficient escrow balance
        const totalReleased = project.released_usdc + amount_usdc;
        if (totalReleased > project.budget_usdc) {
            res.status(400).json({ 
                error: 'Insufficient escrow balance',
                available: project.budget_usdc - project.released_usdc,
                requested: amount_usdc
            });
            return;
        }

        // Initiate x402 payment release
        const paymentResponse = await releasePayment(
            amount_usdc,
            freelancer.wallet_address,
            client.wallet_address,
            project._id.toString()
        );

        // Create ledger entry
        const ledgerEntry = await PaymentLedger.create({
            project_id: project._id,
            transaction_type: 'MILESTONE_RELEASE',
            amount_usdc,
            x402_stream_id: paymentResponse.streamId,
            x402_facilitator_url: paymentResponse.facilitatorUrl,
            status: paymentResponse.status,
            triggered_by: 'CLIENT_APPROVAL'
        });

        // Update project
        project.released_usdc = totalReleased;
        if (totalReleased >= project.budget_usdc) {
            project.payment_status = 'RELEASED';
        } else {
            project.payment_status = 'PENDING_RELEASE';
        }
        await project.save();

        res.status(201).json({
            message: 'Payment release initiated',
            ledger: ledgerEntry,
            payment: {
                stream_id: paymentResponse.streamId,
                facilitator_url: paymentResponse.facilitatorUrl,
                status: paymentResponse.status
            },
            project: {
                released_usdc: project.released_usdc,
                remaining_usdc: project.budget_usdc - project.released_usdc
            }
        });
    } catch (error) {
        console.error('Payment release error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/payments/:projectId/ledger
 * Get payment history for a project
 */
router.get('/:projectId/ledger', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;

        // Verify user has access to this project
        const project = await Project.findById(projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const userId = req.user!.userId;
        if (project.client_id.toString() !== userId && project.freelancer_id?.toString() !== userId) {
            res.status(403).json({ error: 'You do not have permission to view this project\'s payment ledger' });
            return;
        }

        // Get all ledger entries for this project
        const ledger = await PaymentLedger.find({ project_id: projectId })
            .sort({ created_at: -1 })
            .lean();

        res.status(200).json({
            project_id: projectId,
            ledger,
            summary: {
                total_deposited: project.budget_usdc,
                total_released: project.released_usdc,
                remaining: project.budget_usdc - project.released_usdc,
                payment_status: project.payment_status
            }
        });
    } catch (error) {
        console.error('Get ledger error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/payments/confirm/:streamId
 * Confirm an x402 payment transaction (webhook or polling endpoint)
 */
router.post('/confirm/:streamId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { streamId } = req.params;

        // Find ledger entry
        const ledgerEntry = await PaymentLedger.findOne({ x402_stream_id: streamId });
        if (!ledgerEntry) {
            res.status(404).json({ error: 'Payment stream not found' });
            return;
        }

        // Confirm payment on blockchain
        const confirmation = await confirmX402Payment(streamId);

        if (confirmation.confirmed) {
            ledgerEntry.status = 'CONFIRMED';
            ledgerEntry.coinbase_tx_hash = confirmation.txHash;
            ledgerEntry.confirmed_at = new Date();
            await ledgerEntry.save();

            res.status(200).json({
                message: 'Payment confirmed',
                ledger: ledgerEntry
            });
        } else {
            res.status(400).json({ error: 'Payment not yet confirmed' });
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
