import { callFireworksAI, AgentResponse, MODELS } from '../services/fireworks';
import { Project, Revision, AgentAction, IRequirements } from '../models';
import { Types } from 'mongoose';

export interface CodeCriticOutput {
    score: number;  // 0.0 - 1.0
    feedback: string;
    blockers: string[];
    suggestions: string[];
    code_quality: {
        logic_issues: string[];
        security_issues: string[];
        performance_issues: string[];
        best_practices: string[];
    };
    reasoning: string;
}

const CODE_CRITIC_SYSTEM_PROMPT = `You are the Code Critic Agent in OverHeadAI, a specialized AI for code quality verification.

Your job is to perform deep code analysis:
- Static analysis for bugs and logic flaws
- Security vulnerability detection
- Performance issue identification
- Best practices compliance
- Requirements matching

CRITICAL: This is the "Gatekeeper" - only scores >= 0.8 will be shown to the client. Be strict but fair.

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "score": number (0.0 to 1.0, where 0.8+ means "ready for client review"),
  "feedback": "string (detailed analysis of the code)",
  "blockers": ["string array of issues that MUST be fixed before client review"],
  "suggestions": ["string array of optional improvements"],
  "code_quality": {
    "logic_issues": ["array of logic bugs or flaws found"],
    "security_issues": ["array of security vulnerabilities"],
    "performance_issues": ["array of performance concerns"],
    "best_practices": ["array of best practice violations"]
  },
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
 * Code Critic Agent - Specialized code analysis using Qwen2.5-Coder-32B
 */
export async function runCodeCriticAgent(
    projectId: Types.ObjectId | string,
    revisionId: Types.ObjectId | string,
    requirements: IRequirements,
    files: { filename: string; content: string; language: string }[],
    notes: string,
    triggeredBy?: Types.ObjectId
): Promise<AgentResponse<CodeCriticOutput>> {

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

## SUBMITTED CODE

### Freelancer's Notes:
${notes || 'No notes provided'}

### Submitted Files:
${filesFormatted}

---

## TASK
Perform comprehensive code analysis. Check:
1. Does it meet ALL acceptance criteria?
2. Are there any logic bugs or flaws?
3. Are there security vulnerabilities?
4. Are there performance issues?
5. Does it follow best practices for the tech stack?
6. Is the code production-ready?

Score strictly - only 0.8+ should reach the client.
Respond with the JSON schema specified.`;

    const result = await callFireworksAI<CodeCriticOutput>(
        CODE_CRITIC_SYSTEM_PROMPT,
        userPrompt,
        MODELS.QWEN_CODER  // Using Qwen2.5-Coder-32B for code analysis
    );

    // Log the agent action to MongoDB
    try {
        await AgentAction.create({
            agent: 'CODE_CRITIC',
            action: 'ANALYZED_CODE',
            project_id: new Types.ObjectId(projectId.toString()),
            revision_id: new Types.ObjectId(revisionId.toString()),
            reasoning: result.data?.reasoning || result.error || 'Unknown',
            confidence: result.success ? (result.data?.score || 0) : 0,
            model_used: MODELS.QWEN_CODER,
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.success ? result.data : { error: result.error },
            triggered_by: triggeredBy,
            handoff_reason: 'Code files detected in submission'
        });
    } catch (logError) {
        console.error('Failed to log agent action:', logError);
    }

    return result;
}

/**
 * Process a revision with the Code Critic Agent
 */
export async function processRevisionWithCodeCritic(
    revisionId: string,
    triggeredBy?: Types.ObjectId
): Promise<{ success: boolean; score?: number; output?: CodeCriticOutput; error?: string }> {

    try {
        const revision = await Revision.findById(revisionId);
        if (!revision) {
            return { success: false, error: 'Revision not found' };
        }

        const project = await Project.findById(revision.project_id);
        if (!project || !project.requirements) {
            return { success: false, error: 'Project or requirements not found' };
        }

        // Filter to only code files (not images)
        const codeFiles = revision.files.filter(f =>
            !['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].some(ext =>
                f.filename.toLowerCase().endsWith(`.${ext}`)
            )
        );

        if (codeFiles.length === 0) {
            return { success: false, error: 'No code files found in revision' };
        }

        console.log(`🔍 Code Critic (Qwen) analyzing ${codeFiles.length} files...`);

        // Run the Code Critic Agent
        const result = await runCodeCriticAgent(
            project._id,
            revision._id,
            project.requirements,
            codeFiles,
            revision.notes,
            triggeredBy
        );

        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'Agent failed' };
        }

        return {
            success: true,
            score: result.data.score,
            output: result.data
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Code Critic processing error:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
