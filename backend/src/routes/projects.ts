import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project, User, Revision } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';
import { processProjectWithArchitect } from '../agents/architect';
import { processRequirementsChange } from '../agents/delta-analyzer';
import { generateProjectCode } from '../utils/helpers';

const router = Router();

// POST /api/projects - Create a new project (Client only)
router.post('/', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, freelancer_email } = req.body;

        // Validation
        if (!title || !description || !freelancer_email) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['title', 'description', 'freelancer_email']
            });
            return;
        }

        // Generate unique project code
        const project_code = await generateProjectCode(Project);

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
            budget_usdc: 0,
            original_budget_usdc: 0, // Store original budget for delta analysis
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
                    current_revision: project.current_revision,
                    // Clients now see full requirements for editing
                    requirements: project.requirements
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

// PUT /api/projects/:id/requirements - Update project requirements (Client only)
router.put('/:id/requirements', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { structured_brief, acceptance_criteria, technical_stack, estimated_hours, change_reason } = req.body;

        // Validation
        if (!structured_brief || !acceptance_criteria || !Array.isArray(acceptance_criteria)) {
            res.status(400).json({
                error: 'Invalid requirements format',
                required: ['structured_brief', 'acceptance_criteria (array)']
            });
            return;
        }

        // Get the project
        const project = await Project.findById(id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Authorization check
        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'You can only update your own projects' });
            return;
        }

        // Check if project allows requirements updates
        if (!['REQUIREMENTS_GENERATED', 'IN_PROGRESS'].includes(project.status)) {
            res.status(400).json({
                error: 'Requirements cannot be updated in current project status',
                current_status: project.status,
                allowed_statuses: ['REQUIREMENTS_GENERATED', 'IN_PROGRESS']
            });
            return;
        }

        // Check if requirements exist (can't update what doesn't exist)
        if (!project.requirements) {
            res.status(400).json({
                error: 'No requirements to update',
                message: 'Project requirements have not been generated yet'
            });
            return;
        }

        const oldRequirements = project.requirements;
        const newRequirements = {
            structured_brief,
            acceptance_criteria,
            technical_stack: technical_stack || oldRequirements.technical_stack,
            estimated_hours: estimated_hours || oldRequirements.estimated_hours,
            architect_reasoning: oldRequirements.architect_reasoning // Preserve original reasoning
        };

        // Process the requirements change with Delta Analysis
        const changeResult = await processRequirementsChange(
            id,
            oldRequirements,
            newRequirements,
            change_reason || 'Client updated requirements',
            new Types.ObjectId(req.user!.userId)
        );

        if (!changeResult.success) {
            res.status(500).json({
                error: 'Failed to update requirements',
                message: changeResult.error
            });
            return;
        }

        // Get updated project
        const updatedProject = await Project.findById(id);

        res.status(200).json({
            message: 'Requirements updated successfully',
            project: {
                id: updatedProject!._id,
                requirements: updatedProject!.requirements,
                requirements_version: updatedProject!.requirements_version
            },
            delta_analysis: changeResult.deltaAnalysis,
            requires_approval: changeResult.requiresApproval,
            pending_approval: updatedProject!.pending_delta_approval
        });

    } catch (error) {
        console.error('Update requirements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/projects/:id - Delete project (Client only)
router.delete('/:id', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        // Get the project first to verify ownership
        const project = await Project.findById(id);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Verify client owns the project
        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'You can only delete your own projects' });
            return;
        }

        // Check if project can be deleted (prevent deletion if work is already approved/completed)
        if (['APPROVED', 'COMPLETED'].includes(project.status)) {
            res.status(400).json({ 
                error: 'Cannot delete approved or completed projects',
                status: project.status 
            });
            return;
        }

        // Delete related revisions first
        await Revision.deleteMany({ project_id: id });
        
        // Delete the project
        await Project.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Project deleted successfully',
            project_code: project.project_code
        });

    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
