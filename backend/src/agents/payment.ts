import { Project, Revision, PaymentLedger, User } from '../models';
import { releasePayment } from '../services/coinbase-x402';
import { Types } from 'mongoose';

export interface AutomaticPaymentResult {
    success: boolean;
    amount?: number;
    streamId?: string;
    error?: string;
}

/**
 * Payment Agent - Automatically releases payment when work passes quality threshold
 * 
 * This agent triggers automatic payment release when:
 * - Revision score >= 0.8 (visible_to_client = true)
 * - Both client and freelancer have wallets connected
 * - Project has escrow funds available
 * 
 * Payment calculation strategy:
 * - First milestone (score >= 0.8): 50% of budget
 * - Subsequent milestones: 25% of budget each
 * - Final payment when project completed: remaining balance
 */
export async function triggerAutomaticPayment(
    revisionId: string
): Promise<AutomaticPaymentResult> {
    try {
        const revision = await Revision.findById(revisionId);
        if (!revision) {
            return { success: false, error: 'Revision not found' };
        }

        // Only trigger for work that's visible to client (score >= 0.8)
        if (!revision.visible_to_client) {
            return { success: false, error: 'Work does not meet quality threshold (score < 8/10)' };
        }

        const project = await Project.findById(revision.project_id);
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        // Get client and freelancer
        const client = await User.findById(project.client_id);
        const freelancer = await User.findById(project.freelancer_id);

        if (!client || !client.wallet_address) {
            return { success: false, error: 'Client wallet not connected. Payment cannot be automated.' };
        }

        if (!freelancer || !freelancer.wallet_address) {
            return { success: false, error: 'Freelancer wallet not connected. Payment cannot be automated.' };
        }

        // Check if payment already released for this revision
        const existingPayment = await PaymentLedger.findOne({
            project_id: project._id,
            transaction_type: 'MILESTONE_RELEASE',
            'notes': { $regex: `revision.*${revision.revision_number}` }
        });

        if (existingPayment) {
            return { success: false, error: 'Payment already released for this revision' };
        }

        // Calculate payment amount based on milestone strategy
        const remainingBudget = project.budget_usdc - (project.released_usdc || 0);
        if (remainingBudget <= 0) {
            return { success: false, error: 'No remaining budget for payment' };
        }

        // Determine payment amount based on revision number and remaining budget
        let paymentAmount: number;
        const isFirstMilestone = (project.released_usdc || 0) === 0;
        const isFinalMilestone = project.status === 'COMPLETED' || project.status === 'APPROVED';

        if (isFinalMilestone) {
            // Final payment: release all remaining budget
            paymentAmount = remainingBudget;
        } else if (isFirstMilestone) {
            // First milestone: 50% of total budget
            paymentAmount = Math.min(project.budget_usdc * 0.5, remainingBudget);
        } else {
            // Subsequent milestones: 25% of total budget (or remaining if less)
            paymentAmount = Math.min(project.budget_usdc * 0.25, remainingBudget);
        }

        // Round to 2 decimal places
        paymentAmount = Math.round(paymentAmount * 100) / 100;

        if (paymentAmount <= 0) {
            return { success: false, error: 'Calculated payment amount is zero' };
        }

        // Check if sufficient escrow balance
        if (paymentAmount > remainingBudget) {
            return { 
                success: false, 
                error: `Insufficient escrow balance. Available: $${remainingBudget}, Requested: $${paymentAmount}` 
            };
        }

        console.log(`💰 Payment Agent: Auto-releasing $${paymentAmount} USDC for revision #${revision.revision_number} (score: ${Math.round(revision.critic_score * 10)}/10)`);

        // Initiate x402 payment release
        const paymentResponse = await releasePayment(
            paymentAmount,
            freelancer.wallet_address,
            client.wallet_address,
            project._id.toString()
        );

        // Create ledger entry
        const ledgerEntry = await PaymentLedger.create({
            project_id: project._id,
            transaction_type: 'MILESTONE_RELEASE',
            amount_usdc: paymentAmount,
            x402_stream_id: paymentResponse.streamId,
            x402_facilitator_url: paymentResponse.facilitatorUrl,
            status: paymentResponse.status,
            triggered_by: 'PAYMENT_AGENT',
            notes: `Automatic payment for revision #${revision.revision_number} (score: ${Math.round(revision.critic_score * 10)}/10)`
        });

        // Update project
        const newReleasedAmount = (project.released_usdc || 0) + paymentAmount;
        project.released_usdc = newReleasedAmount;
        
        if (newReleasedAmount >= project.budget_usdc) {
            project.payment_status = 'RELEASED';
        } else {
            project.payment_status = 'PENDING_RELEASE';
        }
        await project.save();

        console.log(`✅ Payment Agent: Payment released successfully. Stream ID: ${paymentResponse.streamId}`);

        return {
            success: true,
            amount: paymentAmount,
            streamId: paymentResponse.streamId
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Payment Agent error:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
