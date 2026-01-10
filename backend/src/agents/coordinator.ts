import { Types } from 'mongoose';
import { Revision, Project, AgentAction } from '../models';
import { processRevisionWithCodeCritic, CodeCriticOutput } from './code-critic';
import { notifyClientOfVerifiedWork } from './mediator';

export interface CoordinatorResult {
    success: boolean;
    code_critic_score?: number;
    vision_critic_score?: number;
    combined_score?: number;
    visible_to_client: boolean;
    error?: string;
    agent_chain: string[];
}

// File extensions that are considered code
const CODE_EXTENSIONS = [
    'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'vue',
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml',
    'md', 'sql', 'sh', 'bash', 'zsh', 'dockerfile', 'makefile'
];

// File extensions that are considered images (for Vision Critic)
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];

/**
 * Analyze file types in a revision to determine which critics to invoke
 */
function analyzeFileTypes(files: { filename: string }[]): { hasCode: boolean; hasImages: boolean } {
    let hasCode = false;
    let hasImages = false;

    for (const file of files) {
        const ext = file.filename.split('.').pop()?.toLowerCase() || '';

        if (CODE_EXTENSIONS.includes(ext)) {
            hasCode = true;
        }
        if (IMAGE_EXTENSIONS.includes(ext)) {
            hasImages = true;
        }
    }

    return { hasCode, hasImages };
}

/**
 * Agent Coordinator - Routes revisions to appropriate critic agents
 * and aggregates their results
 */
export async function coordinateRevisionReview(
    revisionId: string
): Promise<CoordinatorResult> {
    const agentChain: string[] = ['COORDINATOR'];

    try {
        const revision = await Revision.findById(revisionId);
        if (!revision) {
            return { success: false, error: 'Revision not found', visible_to_client: false, agent_chain: agentChain };
        }

        if (revision.status !== 'PENDING_REVIEW') {
            return { success: false, error: 'Revision already reviewed', visible_to_client: false, agent_chain: agentChain };
        }

        const project = await Project.findById(revision.project_id);
        if (!project || !project.requirements) {
            return { success: false, error: 'Project or requirements not found', visible_to_client: false, agent_chain: agentChain };
        }

        // Analyze file types
        const { hasCode, hasImages } = analyzeFileTypes(revision.files);
        console.log(`📋 Coordinator: Analyzing revision #${revision.revision_number}`);
        console.log(`   - Code files detected: ${hasCode}`);
        console.log(`   - Image files detected: ${hasImages}`);

        let codeCriticScore: number | undefined;
        let codeCriticOutput: CodeCriticOutput | undefined;
        let visionCriticScore: number | undefined;

        // Run Code Critic if there are code files
        if (hasCode) {
            console.log(`🔍 Routing to Code Critic (Qwen2.5-Coder-32B)...`);
            agentChain.push('CODE_CRITIC');

            const codeResult = await processRevisionWithCodeCritic(revisionId);

            if (codeResult.success && codeResult.score !== undefined) {
                codeCriticScore = codeResult.score;
                codeCriticOutput = codeResult.output;
                console.log(`✅ Code Critic score: ${Math.round(codeCriticScore * 10)}/10`);
            } else {
                console.error(`❌ Code Critic failed: ${codeResult.error}`);
            }
        }

        // Run Vision Critic if there are image files (placeholder for now)
        if (hasImages) {
            console.log(`🖼️ Vision Critic not yet implemented - skipping image analysis`);
            // agentChain.push('VISION_CRITIC');
            // visionCriticScore = await processRevisionWithVisionCritic(revisionId);
        }

        // Calculate combined score
        let combinedScore: number;
        if (codeCriticScore !== undefined && visionCriticScore !== undefined) {
            // Weight: 60% code, 40% vision
            combinedScore = (codeCriticScore * 0.6) + (visionCriticScore * 0.4);
        } else if (codeCriticScore !== undefined) {
            combinedScore = codeCriticScore;
        } else if (visionCriticScore !== undefined) {
            combinedScore = visionCriticScore;
        } else {
            return {
                success: false,
                error: 'No critics could analyze this revision',
                visible_to_client: false,
                agent_chain: agentChain
            };
        }

        // THE GATEKEEPER LOGIC: Only visible to client if score >= 0.8
        const visibleToClient = combinedScore >= 0.8;

        // Update the revision with all critic evaluations
        await Revision.findByIdAndUpdate(revisionId, {
            $set: {
                critic_score: combinedScore,
                critic_feedback: codeCriticOutput?.feedback || '',
                critique_reasoning: codeCriticOutput?.reasoning || '',
                blockers: codeCriticOutput?.blockers || [],
                suggestions: codeCriticOutput?.suggestions || [],
                visible_to_client: visibleToClient,
                status: 'REVIEWED'
            }
        });

        // Update project's highest score if this is better
        if (combinedScore > (project.highest_score || 0)) {
            await Project.findByIdAndUpdate(project._id, {
                $set: { highest_score: combinedScore }
            });
        }

        // Update project status
        await Project.findByIdAndUpdate(project._id, {
            $set: { status: 'IN_REVIEW' }
        });

        // If visible to client, trigger Mediator
        if (visibleToClient) {
            console.log(`🔔 Score >= 8/10 - Triggering Mediator Agent...`);
            agentChain.push('MEDIATOR');

            const notifyResult = await notifyClientOfVerifiedWork(revisionId);
            if (notifyResult.success) {
                console.log(`✅ Client notification sent`);
            } else {
                console.log(`⚠️ Mediator notification failed: ${notifyResult.error}`);
            }
        } else {
            console.log(`📝 Score ${Math.round(combinedScore * 10)}/10 below threshold - feedback sent to freelancer only`);
        }

        // Log coordinator action
        await AgentAction.create({
            agent: 'ARCHITECT', // Using ARCHITECT as coordinator for now since it's already in enum legacy
            action: 'COORDINATED_REVIEW',
            project_id: project._id,
            revision_id: revision._id,
            reasoning: `Routed to: ${agentChain.slice(1).join(' → ')}. Combined score: ${Math.round(combinedScore * 10)}/10`,
            confidence: combinedScore,
            model_used: 'coordinator',
            latency_ms: 0,
            result: {
                code_critic_score: codeCriticScore,
                vision_critic_score: visionCriticScore,
                combined_score: combinedScore,
                agent_chain: agentChain,
                visible_to_client: visibleToClient
            }
        });

        return {
            success: true,
            code_critic_score: codeCriticScore,
            vision_critic_score: visionCriticScore,
            combined_score: combinedScore,
            visible_to_client: visibleToClient,
            agent_chain: agentChain
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Coordinator error:', errorMessage);
        return {
            success: false,
            error: errorMessage,
            visible_to_client: false,
            agent_chain: agentChain
        };
    }
}
