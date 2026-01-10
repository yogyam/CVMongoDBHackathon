import { callFireworksAI, AgentResponse } from '../services/fireworks';
import { Project, AgentAction } from '../models';
import { Types } from 'mongoose';

export interface ArchitectOutput {
    structured_brief: string;
    acceptance_criteria: string[];
    technical_stack: string[];
    estimated_hours: number;
    reasoning: string;
}

const ARCHITECT_SYSTEM_PROMPT = `You are the Architect Agent in Syntropy Protocol, an AI-powered freelance mediation platform.

Your job is to take a client's raw project description and generate a comprehensive, actionable technical brief that a freelancer can immediately understand and start working on.

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "structured_brief": "string (markdown format, detailed project specification)",
  "acceptance_criteria": ["string array of specific, testable requirements"],
  "technical_stack": ["string array of recommended technologies"],
  "estimated_hours": number,
  "reasoning": "string explaining your assumptions and decisions"
}

Guidelines:
1. If the client's description is vague, make reasonable assumptions based on industry standards
2. Always ask yourself: "What did the client forget to mention?" and include those requirements
3. Acceptance criteria should be specific and testable (e.g., "User can log in with email/password" not "Login works")
4. Keep the technical stack minimal but practical for the project scope
5. Estimate hours realistically - include time for testing and iteration
6. Your reasoning should explain WHY you made certain assumptions`;

/**
 * Architect Agent - Converts raw client description into structured requirements
 */
export async function runArchitectAgent(
    projectId: Types.ObjectId | string,
    rawDescription: string,
    title: string,
    budget: number
): Promise<AgentResponse<ArchitectOutput>> {

    const userPrompt = `
PROJECT TITLE: ${title}

CLIENT'S RAW DESCRIPTION:
${rawDescription}

PROJECT BUDGET: $${budget} USDC

TASK:
Generate a comprehensive technical brief that converts this vague description into an actionable specification. Consider:
- What features are explicitly requested?
- What features are implied but not mentioned?
- What technical requirements are necessary?
- What are the acceptance criteria for "done"?

Respond with the JSON schema specified.`;

    const result = await callFireworksAI<ArchitectOutput>(
        ARCHITECT_SYSTEM_PROMPT,
        userPrompt
    );

    // Log the agent action to MongoDB
    try {
        await AgentAction.create({
            agent: 'ARCHITECT',
            action: 'GENERATED_REQUIREMENTS',
            project_id: new Types.ObjectId(projectId.toString()),
            reasoning: result.data?.reasoning || result.error || 'Unknown',
            confidence: result.success ? 0.85 : 0,
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
 * Process a project with the Architect Agent and update MongoDB
 */
export async function processProjectWithArchitect(
    projectId: string
): Promise<{ success: boolean; error?: string }> {

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        if (project.status !== 'CREATED') {
            return { success: false, error: 'Project already processed' };
        }

        // Run the Architect Agent
        const result = await runArchitectAgent(
            project._id,
            project.raw_description,
            project.title,
            project.budget_usdc
        );

        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'Agent failed' };
        }

        // Update the project with generated requirements
        await Project.findByIdAndUpdate(projectId, {
            $set: {
                requirements: {
                    structured_brief: result.data.structured_brief,
                    acceptance_criteria: result.data.acceptance_criteria,
                    technical_stack: result.data.technical_stack,
                    estimated_hours: result.data.estimated_hours,
                    architect_reasoning: result.data.reasoning
                },
                status: 'REQUIREMENTS_GENERATED',
                requirements_generated_at: new Date()
            }
        });

        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Architect processing error:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
