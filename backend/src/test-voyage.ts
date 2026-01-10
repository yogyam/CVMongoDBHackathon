import dotenv from 'dotenv';
import path from 'path';
import { generateCodeEmbeddings } from './services/voyage';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testVoyage() {
    console.log('Testing Voyage AI API...');

    // Check if key is loaded
    if (!process.env.VOYAGE_API_KEY) {
        console.error('❌ VOYAGE_API_KEY is missing from environment!');
        return;
    }
    console.log('Key found:', process.env.VOYAGE_API_KEY.substring(0, 5) + '...');

    const sampleText = ["console.log('Hello World');", "function test() { return true; }"];

    try {
        console.log('Generating embeddings for 2 sample snippets...');
        const embeddings = await generateCodeEmbeddings(sampleText);

        if (embeddings.length > 0) {
            console.log(`✅ Success! Generated ${embeddings.length} embeddings.`);
            console.log(`Embedding dimensions: ${embeddings[0].length}`);
            console.log('Sample vector (first 5 dims):', embeddings[0].slice(0, 5));
        } else {
            console.error('❌ Failed to generate embeddings (empty result).');
        }
    } catch (error) {
        console.error('❌ Exception during Voyage test:', error);
    }
}

testVoyage();
