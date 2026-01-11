import { callFireworksAI, AgentResponse, MODELS } from '../services/fireworks';
import { IRequirements, Project, AgentAction } from '../models';
import { Types } from 'mongoose';

export interface DeltaAnalysisOutput {
    cost_impact_usdc: number;
    hours_difference: number;
    scope_change: 'increase' | 'decrease' | 'modification';
    requires_approval: boolean;
    change_summary: string;
    reasoning: string;
    recommendations: string[];
}

const DELTA_ANALYZER_SYSTEM_PROMPT = `You are the Delta Analysis Agent in OverHeadAI, an AI-powered freelance mediation platform.

Your job is to analyze changes between old and new project requirements and calculate the cost impact in USDC.

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "cost_impact_usdc": number (positive = cost increase, negative = cost decrease, 0 = no change),
  "hours_difference": number (positive = more hours needed, negative = fewer hours),
  "scope_change": "increase" | "decrease" | "modification",
  "requires_approval": boolean (true if cost increase > 10% of original budget),
  "change_summary": "string (brief summary of what changed)",
  "reasoning": "string (detailed explanation of cost calculation)",
  "recommendations": ["string array of suggestions for managing the change"]
}

Cost Calculation Guidelines:
- Estimate based on standard freelance rates: $50-100 USDC per hour
- Consider complexity: simple UI changes vs complex backend logic
- Account for testing and iteration time
- Be conservative but fair - slight overestimates are better than underestimates
- If scope is reduced, calculate potential refund amount

Change Categories:
- **increase**: New features, more complex requirements, additional deliverables
- **decrease**: Removed features, simplified requirements, reduced scope
- **modification**: Same scope but different approach, similar complexity

Approval Threshold:
- Set requires_approval = true if cost increase > 10% of original budget
- Always require approval for scope increases, even if cost impact is small`;

/**
 * Delta Analysis Agent - Analyzes cost impact of requirements changes
 */
export async function runDeltaAnalysisAgent(
    projectId: Types.ObjectId | string,
    oldRequirements: IRequirements,
    newRequirements: IRequirements,
    originalBudget: number
): Promise<AgentResponse<DeltaAnalysisOutput>> {

    const userPrompt = `
## ORIGINAL REQUIREMENTS

### Structured Brief:
${oldRequirements.structured_brief}

### Acceptance Criteria:
${oldRequirements.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### Tech Stack:
${oldRequirements.technical_stack.join(', ')}

### Original Estimated Hours: ${oldRequirements.estimated_hours}

---

## NEW/UPDATED REQUIREMENTS

### Structured Brief:
${newRequirements.structured_brief}

### Acceptance Criteria:
${newRequirements.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### Tech Stack:
${newRequirements.technical_stack.join(', ')}

### New Estimated Hours: ${newRequirements.estimated_hours}

---

## PROJECT CONTEXT
- Original Budget: $${originalBudget} USDC
- Approval Threshold: 10% increase = $${Math.round(originalBudget * 0.1)} USDC

## TASK
Analyze the differences between old and new requirements. Calculate:
1. How many additional/fewer hours are needed?
2. What's the cost impact in USDC?
3. Does this require client approval?
4. What changed and why does it affect cost?

Be specific about what features were added/removed/modified.
Respond with the JSON schema specified.`;

    const result = await callFireworksAI<DeltaAnalysisOutput>(
        DELTA_ANALYZER_SYSTEM_PROMPT,
        userPrompt,
        MODELS.FIREFUNCTION
    );

    // Log the agent action to MongoDB
    try {
        await AgentAction.create({
            agent: 'ARCHITECT', // Using ARCHITECT for now since DELTA_ANALYZER not in enum
            action: 'ANALYZED_DELTA',
            project_id: new Types.ObjectId(projectId.toString()),
            reasoning: result.data?.reasoning || result.error || 'Delta analysis performed',
            confidence: result.success ? 0.8 : 0,
            model_used: result.model_used || MODELS.FIREFUNCTION,
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.success ? result.data : { error: result.error }
        });
    } catch (logError) {
        console.error('Failed to log delta analysis action:', logError);
    }

    return result;
}

/**
 * Process requirements change with Delta Analysis
 */
export async function processRequirementsChange(
    projectId: string,
    oldRequirements: IRequirements,
    newRequirements: IRequirements,
    changeReason: string,
    updatedBy: Types.ObjectId
): Promise<{ success: boolean; deltaAnalysis?: DeltaAnalysisOutput; error?: string; requiresApproval: boolean }> {
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return { success: false, error: 'Project not found', requiresApproval: false };
        }

        // Run Delta Analysis Agent
        const deltaResult = await runDeltaAnalysisAgent(
            projectId,
            oldRequirements,
            newRequirements,
            project.original_budget_usdc || project.budget_usdc
        );

        if (!deltaResult.success || !deltaResult.data) {
            return { 
                success: false, 
                error: deltaResult.error || 'Delta analysis failed', 
                requiresApproval: false 
            };
        }

        const deltaAnalysis = deltaResult.data;

        // Update requirements history
        const newVersion = project.requirements_version + 1;
        
        await Project.findByIdAndUpdate(projectId, {
            $set: {
                requirements: newRequirements,
                requirements_version: newVersion
            },
            $push: {
                requirements_history: {
                    version: project.requirements_version, // Store the old version
                    requirements: oldRequirements,
                    updated_at: new Date(),
                    updated_by: updatedBy,
                    change_reason: changeReason,
                    delta_analysis: {
                        cost_impact_usdc: deltaAnalysis.cost_impact_usdc,
                        hours_difference: deltaAnalysis.hours_difference,
                        scope_change: deltaAnalysis.scope_change,
                        requires_approval: deltaAnalysis.requires_approval,
                        approved: !deltaAnalysis.requires_approval // Auto-approve if no approval needed
                    }
                }
            }
        });

        // If approval required, set pending delta approval
        if (deltaAnalysis.requires_approval && deltaAnalysis.cost_impact_usdc > 0) {
            await Project.findByIdAndUpdate(projectId, {
                $set: {
                    pending_delta_approval: {
                        additional_cost_usdc: deltaAnalysis.cost_impact_usdc,
                        reason: deltaAnalysis.change_summary,
                        requested_at: new Date()
                    }
                }
            });
        }

        return { 
            success: true, 
            deltaAnalysis, 
            requiresApproval: deltaAnalysis.requires_approval 
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Requirements change processing error:', errorMessage);
        return { success: false, error: errorMessage, requiresApproval: false };
    }
}