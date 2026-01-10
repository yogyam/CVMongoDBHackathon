import dotenv from 'dotenv';
import path from 'path';
import { runCodeCriticAgent } from './agents/code-critic';
import { runArchitectAgent } from './agents/architect';
import { runCriticAgent } from './agents/critic';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MOCK_PROJECT_ID = "507f1f77bcf86cd799439011";
const MOCK_REVISION_ID = "507f1f77bcf86cd799439012";

async function testArchitect() {
    console.log('\n--- Testing ARCHITECT Agent ---');
    const description = "I want a simple web app where I can write down my todos. It should look nice.";
    const title = "Simple Todo App";
    const budget = 500;

    try {
        const result = await runArchitectAgent(MOCK_PROJECT_ID, description, title, budget);
        if (result.success && result.data) {
            console.log('✅ Architect Success');
            // console.log('FULL_DATA:', JSON.stringify(result.data, null, 2));
            return result.data;
        } else {
            console.error('❌ Architect Failed:', result.error);
        }
    } catch (e) {
        console.error('❌ Architect Exception:', e);
    }
    return null;
}

async function testCodeCriticEdgeCases(requirements: any) {
    console.log('\n--- Testing CODE CRITIC Agent (Edge Cases) ---');

    // Edge Case: Folder structure + Screenshot
    const files = [
        {
            filename: "src/components/TodoList.tsx",
            content: `
import React from 'react';
export const TodoList = ({ items }) => {
  return <ul>{items.map(i => <li key={i.id}>{i.text}</li>)}</ul>;
}`,
            language: "typescript"
        },
        {
            filename: "src/App.tsx",
            content: `
import React from 'react';
import { TodoList } from './components/TodoList';
export default function App() {
  const todos = [{id: 1, text: 'Test embeddings'}];
  return <div className="app"><TodoList items={todos} /></div>;
}`,
            language: "typescript"
        }
    ];

    const screenshots = [
        {
            filename: "screenshot_v1.png",
            content: "base64_mock_data_pretend_this_is_header_bytes..."
        }
    ];

    const notes = "Refactored into folder structure. Added screenshot of the UI.";

    try {
        console.log('Running with Folder Structure + Screenshot + Voyage Embeddings...');
        const result = await runCodeCriticAgent(
            MOCK_PROJECT_ID,
            MOCK_REVISION_ID,
            requirements,
            files,
            notes,
            undefined, // triggeredBy
            screenshots
        );

        if (result.success && result.data) {
            console.log('✅ Code Critic Edge Case Success');
            console.log('Score:', result.data.score);
            console.log('Feedback Preview:', result.data.feedback.substring(0, 150) + "...");
            console.log('Full Feedback:', result.data.feedback);
        } else {
            console.error('❌ Code Critic Edge Case Failed:', result.error);
        }
    } catch (e) {
        console.error('❌ Code Critic Edge Case Exception:', e);
    }
}

async function main() {
    // 1. Run Architect to get requirements
    const requirementsData = await testArchitect();

    if (requirementsData) {
        const requirements = {
            structured_brief: requirementsData.structured_brief,
            acceptance_criteria: requirementsData.acceptance_criteria,
            technical_stack: requirementsData.technical_stack,
            estimated_hours: requirementsData.estimated_hours,
            architect_reasoning: requirementsData.reasoning
        };

        // 2. Run Code Critic Edge Cases
        await testCodeCriticEdgeCases(requirements);

    } else {
        console.log('Skipping other tests because Architect failed.');
    }
}

main();
