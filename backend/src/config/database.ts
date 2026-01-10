import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(mongoUri);

        console.log('✅ MongoDB Atlas connected successfully');

        // Log connection details (without sensitive info)
        if (mongoose.connection.db) {
            console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
        }

    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

export default connectDB;
