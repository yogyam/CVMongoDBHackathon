import { Router, Request, Response } from 'express';
import { Conversation, Project } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
    startArchitectConversation,
    continueArchitectConversation,
    generateRequirementsFromConversation,
    getConversation
} from '../agents/architect-conversational';

const router = Router();

// POST /api/chat/:projectId/start - Start conversation with Architect (Client only)
router.post('/:projectId/start', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Authorization check
        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({ project_id: project._id });
        if (existingConversation) {
            res.status(400).json({
                error: 'Conversation already exists',
                conversation_id: existingConversation._id,
                status: existingConversation.status
            });
            return;
        }

        // Start the conversation
        const result = await startArchitectConversation(
            project._id.toString(),
            req.user!.userId,
            project.title,
            project.raw_description
        );

        if (!result.success) {
            res.status(500).json({ error: result.error || 'Failed to start conversation' });
            return;
        }

        res.status(201).json({
            message: 'Conversation started',
            response: result.data?.message,
            is_complete: result.data?.is_complete,
            gathered_info: result.data?.gathered_info
        });

    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chat/:projectId/message - Send message to Architect (Client only)
router.post('/:projectId/message', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const conversation = await Conversation.findOne({ project_id: project._id });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found. Start one first.' });
            return;
        }

        if (conversation.status === 'COMPLETED') {
            res.status(400).json({ error: 'Conversation already completed' });
            return;
        }

        // Continue the conversation
        const result = await continueArchitectConversation(
            project._id.toString(),
            message
        );

        if (!result.success) {
            res.status(500).json({ error: result.error || 'Failed to process message' });
            return;
        }

        res.json({
            response: result.data?.message,
            is_complete: result.data?.is_complete,
            gathered_info: result.data?.gathered_info,
            can_generate: result.data?.is_complete
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chat/:projectId/generate - Generate requirements (Client only)
router.post('/:projectId/generate', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const conversation = await Conversation.findOne({ project_id: project._id });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        if (conversation.status !== 'READY_TO_GENERATE') {
            res.status(400).json({
                error: 'Conversation not ready for requirements generation',
                status: conversation.status,
                tip: 'Continue chatting with the Architect until is_complete is true'
            });
            return;
        }

        // Generate requirements
        const result = await generateRequirementsFromConversation(project._id.toString());

        if (!result.success || !result.data) {
            res.status(500).json({ error: result.error || 'Failed to generate requirements' });
            return;
        }

        res.json({
            message: 'Requirements generated successfully',
            requirements: {
                structured_brief: result.data.structured_brief,
                acceptance_criteria: result.data.acceptance_criteria,
                technical_stack: result.data.technical_stack,
                estimated_hours: result.data.estimated_hours
            }
        });

    } catch (error) {
        console.error('Generate requirements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chat/:projectId - Get conversation history (Client only)
router.get('/:projectId', authenticateToken, requireRole(['CLIENT']), async (req: Request, res: Response): Promise<void> => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.client_id.toString() !== req.user!.userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const conversation = await getConversation(project._id.toString());

        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({
            conversation: {
                status: conversation.status,
                messages: conversation.messages,
                gathered_info: conversation.gathered_info,
                started_at: conversation.started_at,
                last_message_at: conversation.last_message_at,
                can_generate: conversation.status === 'READY_TO_GENERATE'
            }
        });

    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
