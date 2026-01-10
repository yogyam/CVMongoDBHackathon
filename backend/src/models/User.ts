import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password_hash: string;
    role: 'CLIENT' | 'FREELANCER';
    full_name: string;
    created_at: Date;

    // Optional future fields
    wallet_address?: string;
    reputation_score?: number;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password_hash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['CLIENT', 'FREELANCER'],
        required: true,
        index: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },

    // Optional fields for future phases
    wallet_address: {
        type: String,
        sparse: true
    },
    reputation_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    }
});

export default mongoose.model<IUser>('User', UserSchema);
