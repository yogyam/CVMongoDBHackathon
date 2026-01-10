import { Router, Request, Response } from 'express';
import { Revision, Project } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';
import { processRevisionWithCritic } from '../agents/critic';
import { notifyClientOfVerifiedWork } from '../agents/mediator';

const router = Router();

// POST /api/revisions - Submit work (Freelancer only)
router.post('/', authenticateToken, requireRole(['FREELANCER']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { project_id, files, notes } = req.body;

        // Validation
        if (!project_id || !files || !Array.isArray(files) || files.length === 0) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['project_id', 'files (array)']
            });
            return;
        }

        // Validate files structure
        for (const file of files) {
            if (!file.filename || !file.content || !file.language) {
                res.status(400).json({
                    error: 'Each file must have filename, content, and language',
                    example: { filename: 'Login.jsx', content: '...', language: 'javascript' }
                });
                return;
            }
        }

        // Get the project
        const project = await Project.findById(project_id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Authorization check
        if (project.freelancer_email !== req.user!.email) {
            res.status(403).json({ error: 'You are not assigned to this project' });
            return;
        }

        // Check project status
        if (!['REQUIREMENTS_GENERATED', 'IN_PROGRESS', 'IN_REVIEW'].includes(project.status)) {
            res.status(400).json({
                error: 'Cannot submit work for this project',
                status: project.status
            });
            return;
        }

        // Calculate next revision number
        const lastRevision = await Revision.findOne({ project_id })
            .sort({ revision_number: -1 });
        const revisionNumber = (lastRevision?.revision_number || 0) + 1;

        // Create the revision
        const revision = await Revision.create({
            project_id: project._id,
            revision_number: revisionNumber,
            submitted_by: req.user!.userId,
            files,
            notes: notes || '',
            status: 'PENDING_REVIEW'
        });

        // Update project current revision
        await Project.findByIdAndUpdate(project_id, {
            $set: {
                current_revision: revisionNumber,
                status: 'IN_REVIEW'
            }
        });

        // Trigger Critic Agent asynchronously
        setImmediate(async () => {
            console.log(`🔍 Critic Agent evaluating revision #${revisionNumber} for ${project.project_code}...`);

            const result = await processRevisionWithCritic(revision._id.toString());

            if (result.success && result.score !== undefined) {
                const scoreLevel = Math.round(result.score * 10);
                console.log(`📊 Critic Agent scored revision #${revisionNumber}: ${scoreLevel}/10`);

                // If score >= 0.8, trigger Mediator to notify client
                if (result.score >= 0.8) {
                    console.log(`🔔 Triggering Mediator Agent for high-quality submission...`);
                    const notifyResult = await notifyClientOfVerifiedWork(revision._id.toString());
                    if (notifyResult.success) {
                        console.log(`✅ Client notification sent successfully`);
                    }
                } else {
                    console.log(`📝 Score below threshold (${scoreLevel}/10) - feedback sent to freelancer only`);
                }
            } else {
                console.error(`❌ Critic Agent failed: ${result.error}`);
            }
        });

        res.status(201).json({
            message: 'Work submitted successfully',
            revision: {
                id: revision._id,
                revision_number: revisionNumber,
                status: 'PENDING_REVIEW'
            },
            info: 'Critic Agent is evaluating your submission. Check back shortly for feedback.'
        });

    } catch (error) {
        console.error('Submit revision error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/revisions/:projectId - Get revisions for a project (role-based)
router.get('/:projectId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const { role, userId, email } = req.user!;

        // Authorization check
        const isClient = project.client_id.toString() === userId;
        const isFreelancer = project.freelancer_email === email;

        if (!isClient && !isFreelancer) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        let revisions;

        if (role === 'CLIENT') {
            // Clients only see revisions where visible_to_client = true
            revisions = await Revision.find({
                project_id: req.params.projectId,
                visible_to_client: true
            })
                .select('-critique_reasoning') // Hide internal reasoning
                .sort({ revision_number: -1 });
        } else {
            // Freelancers see ALL revisions with full feedback
            revisions = await Revision.find({ project_id: req.params.projectId })
                .sort({ revision_number: -1 });
        }

        res.json({
            revisions,
            total: revisions.length,
            role_view: role
        });

    } catch (error) {
        console.error('Get revisions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/revisions/:projectId/:revisionId - Get specific revision
router.get('/:projectId/:revisionId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const revision = await Revision.findById(req.params.revisionId);
        if (!revision || revision.project_id.toString() !== req.params.projectId) {
            res.status(404).json({ error: 'Revision not found' });
            return;
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const { role, userId, email } = req.user!;
        const isClient = project.client_id.toString() === userId;
        const isFreelancer = project.freelancer_email === email;

        if (!isClient && !isFreelancer) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Clients can only view if visible_to_client
        if (isClient && !revision.visible_to_client) {
            res.status(403).json({ error: 'This revision is not yet ready for client review' });
            return;
        }

        res.json({ revision });

    } catch (error) {
        console.error('Get revision error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
