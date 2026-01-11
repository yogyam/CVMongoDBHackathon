import { callFireworksAI, AgentResponse } from '../services/fireworks';
import { Project, Revision, AgentAction } from '../models';
import { Types } from 'mongoose';

export interface MediatorOutput {
    subject: string;
    message: string;
    urgency: 'low' | 'medium' | 'high';
    action_required: boolean;
}

const MEDIATOR_SYSTEM_PROMPT = `You are the Mediator Agent in OverHeadAI, responsible for communicating with clients professionally.

Your job is to craft clear, professional notifications when a freelancer's work passes quality verification (score >= 0.8).

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "subject": "string (email-style subject line, max 60 chars)",
  "message": "string (2-3 sentence update, professional but friendly)",
  "urgency": "low" | "medium" | "high",
  "action_required": boolean
}

Guidelines:
- Be concise and professional
- Highlight what was accomplished without technical jargon
- Explain why the AI trusts this submission
- If score is 0.9+, express confidence; if 0.8-0.9, note it's ready but may have minor improvements pending
- Always indicate if client action (review/approval) is needed`;

/**
 * Mediator Agent - Crafts professional notifications for clients
 */
export async function runMediatorAgent(
    projectId: Types.ObjectId | string,
    revisionId: Types.ObjectId | string,
    projectTitle: string,
    revisionNumber: number,
    score: number,
    freelancerNotes: string
): Promise<AgentResponse<MediatorOutput>> {

    const scoreLevel = Math.round(score * 10);
    const confidenceLevel = score >= 0.9 ? 'high' : score >= 0.8 ? 'good' : 'moderate';

    const userPrompt = `
PROJECT: ${projectTitle}
REVISION NUMBER: #${revisionNumber}
QUALITY SCORE: ${scoreLevel}/10 (${confidenceLevel} confidence)

FREELANCER'S NOTES:
${freelancerNotes || 'No notes provided'}

Generate a professional notification for the client about this verified work submission.
The client should understand:
1. Work is ready for their review
2. Why the AI system trusts this submission
3. What action (if any) they need to take

Respond with the JSON schema specified.`;

    const result = await callFireworksAI<MediatorOutput>(
        MEDIATOR_SYSTEM_PROMPT,
        userPrompt
    );

    // Log the agent action to MongoDB
    try {
        await AgentAction.create({
            agent: 'MEDIATOR',
            action: 'NOTIFIED_CLIENT',
            project_id: new Types.ObjectId(projectId.toString()),
            revision_id: new Types.ObjectId(revisionId.toString()),
            reasoning: `Generated notification for revision #${revisionNumber} with score ${scoreLevel}/10`,
            confidence: score,
            model_used: 'firefunction-v2',
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.success ? result.data : { error: result.error }
        });
    } catch (logError) {
        console.error('Failed to log agent action:', logError);
    }

    return result;
}

/**
 * Notify client about verified work
 */
export async function notifyClientOfVerifiedWork(
    revisionId: string
): Promise<{ success: boolean; notification?: MediatorOutput; error?: string }> {

    try {
        const revision = await Revision.findById(revisionId);
        if (!revision) {
            return { success: false, error: 'Revision not found' };
        }

        if (!revision.visible_to_client) {
            return { success: false, error: 'Revision not visible to client (score < 0.8)' };
        }

        if (revision.client_notified) {
            return { success: false, error: 'Client already notified' };
        }

        const project = await Project.findById(revision.project_id);
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        // Run the Mediator Agent
        const result = await runMediatorAgent(
            project._id,
            revision._id,
            project.title,
            revision.revision_number,
            revision.critic_score,
            revision.notes
        );

        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'Agent failed' };
        }

        // Mark as notified
        await Revision.findByIdAndUpdate(revisionId, {
            $set: { client_notified: true }
        });

        // In a real system, we would send an email or push notification here
        console.log(`📧 CLIENT NOTIFICATION for ${project.title}:`);
        console.log(`   Subject: ${result.data.subject}`);
        console.log(`   Message: ${result.data.message}`);

        return { success: true, notification: result.data };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Mediator notification error:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
