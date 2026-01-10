import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import revisionRoutes from './routes/revisions';
import paymentRoutes from './routes/payments';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // For code submissions
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Syntropy Protocol API',
        version: '1.0.0',
        status: 'running',
        agents: ['Architect', 'Critic', 'Mediator']
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`\n✨ Syntropy Protocol - Multi-Agent Freelance Mediation`);
            console.log(`\n🤖 Active Agents:`);
            console.log(`   - Architect: Converts ideas → requirements`);
            console.log(`   - Critic: Quality scoring (Gatekeeper)`);
            console.log(`   - Mediator: Client notifications`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
