import { callFireworksAI, AgentResponse } from '../services/fireworks';
import { Project, AgentAction, Conversation, IMessage } from '../models';
import { Types } from 'mongoose';

export interface ConversationalResponse {
    message: string;
    is_complete: boolean;
    gathered_info: {
        has_tech_stack: boolean;
        has_features: boolean;
        has_timeline: boolean;
        has_design_preferences: boolean;
    };
}

export interface ArchitectOutput {
    structured_brief: string;
    acceptance_criteria: string[];
    technical_stack: string[];
    estimated_hours: number;
    reasoning: string;
}

const CONVERSATIONAL_SYSTEM_PROMPT = `You are the Architect Agent in Syntropy Protocol, an AI-powered freelance mediation platform.

Your job is to interview the client to understand their project requirements. You should ask clarifying questions to gather enough information to create a comprehensive technical specification.

IMPORTANT RULES:
1. Be friendly and professional
2. Ask ONE focused question at a time (not a list of questions)
3. Track what information you've gathered
4. After 3-5 questions (or when you have enough info), indicate you're ready to generate requirements

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "message": "string (your response to the client - a question, clarification, or acknowledgment)",
  "is_complete": boolean (true when you have enough info to generate requirements),
  "gathered_info": {
    "has_tech_stack": boolean,
    "has_features": boolean,
    "has_timeline": boolean,
    "has_design_preferences": boolean
  }
}

Key areas to understand:
- Core features the client wants
- Technical preferences (tech stack, hosting, etc.)
- Timeline expectations
- Design/UX preferences
- Target users

When is_complete is true, your message should confirm what you understood and say you're ready to generate the requirements.`;

const FINAL_GENERATION_PROMPT = `You are the Architect Agent in Syntropy Protocol.

Based on the conversation with the client, generate a comprehensive technical specification.

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "structured_brief": "string (markdown format, detailed project specification)",
  "acceptance_criteria": ["string array of specific, testable requirements"],
  "technical_stack": ["string array of recommended technologies"],
  "estimated_hours": number,
  "reasoning": "string explaining your assumptions and decisions"
}`;

/**
 * Start a new conversation with the Architect Agent
 */
export async function startArchitectConversation(
    projectId: string,
    clientId: string,
    title: string,
    initialDescription: string
): Promise<AgentResponse<ConversationalResponse>> {

    // Build initial prompt with project context
    const userPrompt = `
A client wants to start a new project.

PROJECT TITLE: ${title}

INITIAL DESCRIPTION FROM CLIENT:
"${initialDescription}"

Please greet the client briefly and ask your first clarifying question to better understand their needs.`;

    const result = await callFireworksAI<ConversationalResponse>(
        CONVERSATIONAL_SYSTEM_PROMPT,
        userPrompt
    );

    if (result.success && result.data) {
        // Create conversation record
        await Conversation.create({
            project_id: new Types.ObjectId(projectId),
            client_id: new Types.ObjectId(clientId),
            messages: [
                { role: 'user', content: initialDescription, timestamp: new Date() },
                { role: 'assistant', content: result.data.message, timestamp: new Date() }
            ],
            status: result.data.is_complete ? 'READY_TO_GENERATE' : 'GATHERING_INFO',
            gathered_info: {
                ...result.data.gathered_info,
                questions_asked: 1
            }
        });

        // Log agent action
        await AgentAction.create({
            agent: 'ARCHITECT',
            action: 'STARTED_CONVERSATION',
            project_id: new Types.ObjectId(projectId),
            reasoning: 'Initiated requirements gathering conversation',
            confidence: 0.5,
            model_used: 'firefunction-v2',
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.data
        });
    }

    return result;
}

/**
 * Continue a conversation with the Architect Agent
 */
export async function continueArchitectConversation(
    projectId: string,
    userMessage: string
): Promise<AgentResponse<ConversationalResponse>> {

    const conversation = await Conversation.findOne({ project_id: projectId });
    if (!conversation) {
        return { success: false, error: 'Conversation not found', latency_ms: 0 };
    }

    if (conversation.status === 'COMPLETED') {
        return { success: false, error: 'Conversation already completed', latency_ms: 0 };
    }

    // Build conversation history for context
    const historyFormatted = conversation.messages.map(m =>
        `${m.role === 'user' ? 'CLIENT' : 'ARCHITECT'}: ${m.content}`
    ).join('\n\n');

    const userPrompt = `
CONVERSATION HISTORY:
${historyFormatted}

CLIENT'S NEW MESSAGE:
"${userMessage}"

GATHERED INFO SO FAR:
- Tech stack discussed: ${conversation.gathered_info.has_tech_stack}
- Features discussed: ${conversation.gathered_info.has_features}
- Timeline discussed: ${conversation.gathered_info.has_timeline}
- Design preferences discussed: ${conversation.gathered_info.has_design_preferences}
- Questions asked: ${conversation.gathered_info.questions_asked}

Continue the conversation. If you have enough information (at least 3 key areas covered or 4+ questions asked), set is_complete to true and summarize what you've learned.`;

    const result = await callFireworksAI<ConversationalResponse>(
        CONVERSATIONAL_SYSTEM_PROMPT,
        userPrompt
    );

    if (result.success && result.data) {
        // Add messages to conversation
        conversation.messages.push(
            { role: 'user', content: userMessage, timestamp: new Date() },
            { role: 'assistant', content: result.data.message, timestamp: new Date() }
        );

        conversation.gathered_info = {
            ...result.data.gathered_info,
            questions_asked: conversation.gathered_info.questions_asked + 1
        };
        conversation.last_message_at = new Date();

        if (result.data.is_complete) {
            conversation.status = 'READY_TO_GENERATE';
        }

        await conversation.save();

        // Log agent action
        await AgentAction.create({
            agent: 'ARCHITECT',
            action: 'CONTINUED_CONVERSATION',
            project_id: new Types.ObjectId(projectId),
            reasoning: `Question ${conversation.gathered_info.questions_asked}, complete: ${result.data.is_complete}`,
            confidence: result.data.is_complete ? 0.9 : 0.6,
            model_used: 'firefunction-v2',
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.data
        });
    }

    return result;
}

/**
 * Generate final requirements from conversation
 */
export async function generateRequirementsFromConversation(
    projectId: string
): Promise<AgentResponse<ArchitectOutput>> {

    const conversation = await Conversation.findOne({ project_id: projectId });
    if (!conversation) {
        return { success: false, error: 'Conversation not found', latency_ms: 0 };
    }

    if (conversation.status !== 'READY_TO_GENERATE') {
        return { success: false, error: 'Conversation not ready for requirements generation', latency_ms: 0 };
    }

    const project = await Project.findById(projectId);
    if (!project) {
        return { success: false, error: 'Project not found', latency_ms: 0 };
    }

    // Build full conversation for context
    const fullConversation = conversation.messages.map(m =>
        `${m.role === 'user' ? 'CLIENT' : 'ARCHITECT'}: ${m.content}`
    ).join('\n\n');

    const userPrompt = `
PROJECT TITLE: ${project.title}
BUDGET: $${project.budget_usdc} USDC

FULL CONVERSATION WITH CLIENT:
${fullConversation}

Based on this conversation, generate a comprehensive technical specification. Extract all requirements discussed and make reasonable assumptions for anything not explicitly mentioned.`;

    const result = await callFireworksAI<ArchitectOutput>(
        FINAL_GENERATION_PROMPT,
        userPrompt
    );

    if (result.success && result.data) {
        // Update project with requirements
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

        // Mark conversation as completed
        conversation.status = 'COMPLETED';
        conversation.completed_at = new Date();
        await conversation.save();

        // Log agent action
        await AgentAction.create({
            agent: 'ARCHITECT',
            action: 'GENERATED_REQUIREMENTS',
            project_id: new Types.ObjectId(projectId),
            reasoning: result.data.reasoning,
            confidence: 0.9,
            model_used: 'firefunction-v2',
            latency_ms: result.latency_ms,
            tokens_used: result.tokens_used,
            result: result.data
        });
    }

    return result;
}

/**
 * Get conversation history
 */
export async function getConversation(projectId: string) {
    return Conversation.findOne({ project_id: projectId });
}
