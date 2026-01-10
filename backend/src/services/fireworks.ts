import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Fireworks AI uses OpenAI-compatible API
const fireworksClient = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY || '',
    baseURL: 'https://api.fireworks.ai/inference/v1'
});

/**
 * Model constants for multi-agent routing
 */
export const MODELS = {
    /** General-purpose function calling and orchestration - Try common model names */
    FIREFUNCTION: process.env.FIREFUNCTION_MODEL!, // Fallback to Llama 3.1 8B
    /** Code analysis, static analysis, logic verification */
    QWEN_CODER: process.env.QWEN_CODER_MODEL!,
    /** Vision/UI analysis (for future Vision Critic) */
    LLAMA_VISION: process.env.LLAMA_VISION_MODEL!,
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];

export interface AgentResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    reasoning?: string;
    latency_ms: number;
    tokens_used?: number;
    model_used?: string;
}

/**
 * Call Fireworks AI with structured JSON output
 */
export async function callFireworksAI<T>(
    systemPrompt: string,
    userPrompt: string,
    model: string = MODELS.FIREFUNCTION
): Promise<AgentResponse<T>> {
    const startTime = Date.now();

    try {
        if (!process.env.FIREWORKS_API_KEY) {
            throw new Error('FIREWORKS_API_KEY not configured');
        }

        const response = await fireworksClient.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 4096
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response content from Fireworks AI');
        }

        const parsed = JSON.parse(content) as T;
        const latency = Date.now() - startTime;

        return {
            success: true,
            data: parsed,
            latency_ms: latency,
            tokens_used: response.usage?.total_tokens,
            model_used: model
        };

    } catch (error) {
        const latency = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error('Fireworks AI error:', errorMessage);

        return {
            success: false,
            error: errorMessage,
            latency_ms: latency
        };
    }
}

export default fireworksClient;
