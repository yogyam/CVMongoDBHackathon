import { callFireworksAI, AgentResponse } from '../services/fireworks';
import { Project, Revision, AgentAction, IRequirements } from '../models';
import { Types } from 'mongoose';

export interface CriticOutput {
    score: number;  // 0.0 - 1.0
    feedback: string;
    blockers: string[];
    suggestions: string[];
    reasoning: string;
}

const CRITIC_SYSTEM_PROMPT = `You are the Critic Agent in OverHeadAI, an AI-powered quality verification system.

Your job is to evaluate a freelancer's submitted work against the project requirements and score it on a scale of 0.0 to 1.0.

CRITICAL: This is the "Gatekeeper" - only scores >= 0.8 will be shown to the client. Be strict but fair.

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "score": number (0.0 to 1.0, where 0.8+ means "ready for client review"),
  "feedback": "string (detailed analysis of the work)",
  "blockers": ["string array of issues that MUST be fixed before client review"],
  "suggestions": ["string array of optional improvements"],
  "reasoning": "string explaining your scoring decision"
}

Scoring Guidelines:
- 0.0-0.3: Major issues, fundamentally incomplete or broken
- 0.4-0.5: Partially complete, significant gaps in requirements
- 0.6-0.7: Most requirements met, but quality issues or missing polish
- 0.8-0.9: Ready for client review, minor improvements possible
- 1.0: Exceptional work, exceeds all requirements

Be specific in your feedback. Instead of "needs improvement", say "Line 45 has no error handling for null inputs".`;

/**
 * Critic Agent - Evaluates submitted work against requirements
 */
export async function runCriticAgent(
    projectId: Types.ObjectId | string,
    revisionId: Types.ObjectId | string,
    requirements: IRequirements,
    files: { filename: string; content: string; language: string }[],
    notes: string
): Promise<AgentResponse<CriticOutput>> {

    // Format files for the prompt
    const filesFormatted = files.map(f =>
        `### File: ${f.filename} (${f.language})\n\`\`\`${f.language}\n${f.content}\n\`\`\``
    ).join('\n\n');

    const userPrompt = `
## PROJECT REQUIREMENTS

### Structured Brief:
${requirements.structured_brief}

### Acceptance Criteria:
${requirements.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### Expected Tech Stack:
${requirements.technical_stack.join(', ')}

---

## SUBMITTED WORK

### Freelancer's Notes:
${notes || 'No notes provided'}

### Submitted Files:
${filesFormatted}

---

## TASK
Evaluate this submission against the requirements. Check:
1. Does it meet ALL acceptance criteria?
2. Is the code quality production-ready?
3. Are there any bugs or security issues?
4. Does it follow best practices for the tech stack?

Score strictly - only 0.8+ should reach the client.
Respond with the JSON schema specified.`;

    const result = await callFireworksAI<CriticOutput>(
        CRITIC_SYSTEM_PROMPT,
        userPrompt
    );

    // Log the agent action to MongoDB
    try {
        await AgentAction.create({
            agent: 'CRITIC',
            action: 'SCORED_REVISION',
            project_id: new Types.ObjectId(projectId.toString()),
            revision_id: new Types.ObjectId(revisionId.toString()),
            reasoning: result.data?.reasoning || result.error || 'Unknown',
            confidence: result.success ? (result.data?.score || 0) : 0,
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
 * Process a revision with the Critic Agent and apply Gatekeeper logic
 */
export async function processRevisionWithCritic(
    revisionId: string
): Promise<{ success: boolean; score?: number; error?: string }> {

    try {
        const revision = await Revision.findById(revisionId);
        if (!revision) {
            return { success: false, error: 'Revision not found' };
        }

        if (revision.status !== 'PENDING_REVIEW') {
            return { success: false, error: 'Revision already reviewed' };
        }

        const project = await Project.findById(revision.project_id);
        if (!project || !project.requirements) {
            return { success: false, error: 'Project or requirements not found' };
        }

        // Run the Critic Agent
        const result = await runCriticAgent(
            project._id,
            revision._id,
            project.requirements,
            revision.files,
            revision.notes
        );

        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'Agent failed' };
        }

        const { score, feedback, blockers, suggestions, reasoning } = result.data;

        // THE GATEKEEPER LOGIC: Only visible to client if score >= 0.8
        const visibleToClient = score >= 0.8;

        // Update the revision with critic's evaluation
        await Revision.findByIdAndUpdate(revisionId, {
            $set: {
                critic_score: score,
                critic_feedback: feedback,
                critique_reasoning: reasoning,
                blockers,
                suggestions,
                visible_to_client: visibleToClient,
                status: 'REVIEWED'
            }
        });

        // Update project's highest score if this is better
        if (score > (project.highest_score || 0)) {
            await Project.findByIdAndUpdate(project._id, {
                $set: { highest_score: score }
            });
        }

        // Update project status
        await Project.findByIdAndUpdate(project._id, {
            $set: { status: 'IN_REVIEW' }
        });

        return { success: true, score };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Critic processing error:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
