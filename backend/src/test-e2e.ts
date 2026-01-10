import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from './config/database';
import { Project, Revision, AgentAction } from './models';
import { processProjectWithArchitect } from './agents/architect';
import { processRevisionWithCodeCritic } from './agents/code-critic';
import { processRevisionWithCritic } from './agents/critic';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_PROJECT_TITLE = "E2E Test Project - Syntropy";
const TEST_PROJECT_DESC = "A small react component that displays a user profile card with an avatar, name, and bio. It should also have a Voyage AI integration.";

async function runE2E() {
    console.log('\n🚀 Starting End-to-End Agent Verification...\n');

    try {
        // 1. Connect to DB
        await connectDB();
        console.log('✅ DB Connected');

        // Cleanup previous test runs
        await Project.deleteMany({ title: TEST_PROJECT_TITLE });
        console.log('🧹 Cleaned up old test data');

        // 2. Client Creates Project
        console.log('\n--- Step 1: Client Creates Project ---');
        const project = await Project.create({
            client_id: new mongoose.Types.ObjectId(), // Mock client
            title: TEST_PROJECT_TITLE,
            raw_description: TEST_PROJECT_DESC,
            budget_usdc: 1000,
            status: 'CREATED',
            freelancer_email: 'test-freelancer@example.com',
            project_code: `E2E-${Date.now()}`
        });
        console.log(`✅ Project Created: ${project._id}`);

        // 3. Architect Agent Runs
        console.log('\n--- Step 2: Architect Agent Verification ---');
        const archResult = await processProjectWithArchitect(project._id.toString());
        if (!archResult.success) throw new Error(`Architect failed: ${archResult.error}`);

        // Refresh project to check requirements
        const updatedProject = await Project.findById(project._id);
        if (!updatedProject?.requirements?.structured_brief) throw new Error('Architect output missing');

        console.log('✅ Architect Generated Constraints:');
        console.log(`   - Est Hours: ${updatedProject.requirements.estimated_hours}`);
        console.log(`   - Stack: ${updatedProject.requirements.technical_stack.join(', ')}`);

        // 4. Freelancer Submits Revision (Code + Screenshot)
        console.log('\n--- Step 3: Freelancer Submits Revision ---');
        const revision = await Revision.create({
            project_id: project._id,
            submitted_by: new mongoose.Types.ObjectId(), // Mock freelancer
            revision_number: 1,
            notes: "Implemented profile card with Voyage AI hook.",
            files: [
                {
                    filename: "src/ProfileCard.tsx",
                    content: "export const ProfileCard = ({user}) => <div className='card'>{user.name}</div>;",
                    language: "typescript"
                },
                {
                    filename: "screenshot.png",
                    content: "fake_base64_image_data",
                    language: "image" // Our logic checks extensions, but good to be explicit
                }
            ],
            status: 'PENDING_REVIEW'
        });
        console.log(`✅ Revision Created: ${revision._id}`);

        // 5. Code Critic Agent Runs (Voyage + Vision + Static Analysis)
        console.log('\n--- Step 4: Code Critic Agent Verification ---');
        const ccResult = await processRevisionWithCodeCritic(revision._id.toString());
        if (!ccResult.success) throw new Error(`Code Critic failed: ${ccResult.error}`);

        console.log(`✅ Code Critic Score: ${ccResult.score}`);
        console.log(`   - Embeddings/Vision used? Check 'feedback' contents.`);

        // 6. Final Critic Agent (Gatekeeper)
        // Note: In real flow, this might be triggered after CC. We test it explicitly here.
        console.log('\n--- Step 5: Critic Agent verification ---');
        const criticResult = await processRevisionWithCritic(revision._id.toString());
        if (!criticResult.success) throw new Error(`Critic failed: ${criticResult.error}`);

        console.log(`✅ Critic Final Score: ${criticResult.score}`);

        console.log('\n✨ E2E VERIFICATION COMPLETE: ALL AGENTS OPERATIONAL ✨');

    } catch (error) {
        console.error('\n❌ E2E Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runE2E();
