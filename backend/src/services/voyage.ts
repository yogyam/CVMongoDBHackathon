import dotenv from 'dotenv';
import { AgentAction } from '../models';

// Ensure env vars are loaded
dotenv.config();

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

export interface VoyageEmbeddingResponse {
    object: string;
    data: {
        embedding: number[];
        index: number;
    }[];
    model: string;
    usage: {
        total_tokens: number;
    };
}

/**
 * Generate embeddings for code snippets using Voyage AI
 * Recommended model: voyage-code-2 (optimized for code)
 */
export async function generateCodeEmbeddings(texts: string[], model: string = 'voyage-code-2'): Promise<number[][]> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ VOYAGE_API_KEY not found! Skipping embeddings.');
        return [];
    }

    try {
        const response = await fetch(VOYAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: texts,
                model: model,
                input_type: 'document' // 'query' or 'document'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Voyage AI API Error: ${response.status} - ${error}`);
        }

        const result = await response.json() as VoyageEmbeddingResponse;
        return result.data.map(d => d.embedding);

    } catch (error) {
        console.error('Failed to generate embeddings:', error);
        return [];
    }
}
