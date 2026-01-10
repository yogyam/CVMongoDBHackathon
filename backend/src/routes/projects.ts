import { Router, Request, Response } from 'express';
import { Project, User } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';
import { processProjectWithArchitect } from '../agents/architect';
import { generateProjectCode } from '../utils/helpers';

const router = Router();

// POST /api/projects - Create a new project (Client only)
router.post('/', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, freelancer_email, budget_usdc } = req.body;

        // Validation
        if (!title || !description || !freelancer_email || !budget_usdc) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['title', 'description', 'freelancer_email', 'budget_usdc']
            });
            return;
        }

        if (budget_usdc <= 0) {
            res.status(400).json({ error: 'Budget must be greater than 0' });
            return;
        }

        // Generate project code
        const projectCount = await Project.countDocuments();
        const project_code = generateProjectCode(projectCount);

        // Check if freelancer exists
        const freelancer = await User.findOne({ email: freelancer_email.toLowerCase() });

        // Create the project
        const project = await Project.create({
            project_code,
            client_id: req.user!.userId,
            freelancer_id: freelancer?._id,
            freelancer_email: freelancer_email.toLowerCase(),
            title,
            raw_description: description,
            budget_usdc,
            status: 'CREATED',
            payment_status: 'ESCROWED'
        });

        // Trigger Architect Agent asynchronously
        setImmediate(async () => {
            console.log(`🏗️  Architect Agent processing project ${project_code}...`);
            const result = await processProjectWithArchitect(project._id.toString());
            if (result.success) {
                console.log(`✅ Architect Agent completed for ${project_code}`);
            } else {
                console.error(`❌ Architect Agent failed for ${project_code}: ${result.error}`);
            }
        });

        res.status(201).json({
            message: 'Project created successfully',
            project: {
                id: project._id,
                project_code: project.project_code,
                title: project.title,
                status: project.status,
                budget_usdc: project.budget_usdc
            },
            info: 'Architect Agent is generating requirements. Check back shortly.'
        });

    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/projects - List projects (role-based)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { role, userId } = req.user!;
        let projects;

        if (role === 'CLIENT') {
            // Clients see projects they created
            projects = await Project.find({ client_id: userId })
                .select('-raw_description')
                .sort({ created_at: -1 });
        } else {
            // Freelancers see projects assigned to them
            projects = await Project.find({ freelancer_email: req.user!.email })
                .sort({ created_at: -1 });
        }

        res.json({ projects });

    } catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/projects/:id - Get project details (role-based view)
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const { role, userId } = req.user!;

        // Authorization check
        const isClient = project.client_id.toString() === userId;
        const isFreelancer = project.freelancer_email === req.user!.email;

        if (!isClient && !isFreelancer) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Role-based response
        if (role === 'CLIENT') {
            res.json({
                project: {
                    id: project._id,
                    project_code: project.project_code,
                    title: project.title,
                    freelancer_email: project.freelancer_email,
                    status: project.status,
                    highest_score: project.highest_score,
                    budget_usdc: project.budget_usdc,
                    payment_status: project.payment_status,
                    created_at: project.created_at,
                    // Clients see requirements summary only
                    requirements_summary: project.requirements?.structured_brief?.substring(0, 500)
                }
            });
        } else {
            // Freelancers see full requirements
            res.json({
                project: {
                    id: project._id,
                    project_code: project.project_code,
                    title: project.title,
                    status: project.status,
                    current_revision: project.current_revision,
                    highest_score: project.highest_score,
                    budget_usdc: project.budget_usdc,
                    created_at: project.created_at,
                    // Full requirements for freelancer
                    requirements: project.requirements
                }
            });
        }

    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/projects/:id/approve - Approve work (Client only)
router.post('/:id/approve', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { revision_id, feedback } = req.body;

        const project = await Project.findById(req.params.id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Authorization check
        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Import Revision model
        const { Revision } = await import('../models');

        // Find the revision to approve
        const revision = revision_id
            ? await Revision.findById(revision_id)
            : await Revision.findOne({
                project_id: project._id,
                visible_to_client: true
            }).sort({ revision_number: -1 });

        if (!revision) {
            res.status(404).json({ error: 'No revision found for approval' });
            return;
        }

        if (!revision.visible_to_client) {
            res.status(400).json({ error: 'This revision is not ready for approval' });
            return;
        }

        // Approve the revision
        await Revision.findByIdAndUpdate(revision._id, {
            $set: {
                status: 'APPROVED',
                client_response: feedback || 'Approved',
                responded_at: new Date()
            }
        });

        // Complete the project
        await Project.findByIdAndUpdate(project._id, {
            $set: {
                status: 'COMPLETED',
                payment_status: 'RELEASED',
                released_usdc: project.budget_usdc,
                completed_at: new Date()
            }
        });

        res.json({
            message: 'Project approved successfully',
            payment: {
                status: 'RELEASED',
                amount_usdc: project.budget_usdc
            }
        });

    } catch (error) {
        console.error('Approve project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/projects/:id/request-changes - Request changes (Client only)
router.post('/:id/request-changes', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { revision_id, changes_requested } = req.body;

        if (!changes_requested) {
            res.status(400).json({ error: 'changes_requested is required' });
            return;
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const { Revision } = await import('../models');

        const revision = revision_id
            ? await Revision.findById(revision_id)
            : await Revision.findOne({
                project_id: project._id,
                visible_to_client: true
            }).sort({ revision_number: -1 });

        if (!revision) {
            res.status(404).json({ error: 'No revision found' });
            return;
        }

        // Mark revision as needing changes
        await Revision.findByIdAndUpdate(revision._id, {
            $set: {
                status: 'REJECTED',
                client_response: changes_requested,
                responded_at: new Date()
            }
        });

        // Update project status
        await Project.findByIdAndUpdate(project._id, {
            $set: { status: 'IN_PROGRESS' }
        });

        res.json({
            message: 'Change request sent to freelancer',
            requires_budget_adjustment: false // TODO: In Phase 5, analyze if changes are out-of-scope
        });

    } catch (error) {
        console.error('Request changes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
