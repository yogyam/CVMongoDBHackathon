import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password_hash: string;
    role: 'CLIENT' | 'FREELANCER';
    full_name: string;
    created_at: Date;

    // Coinbase Wallet Integration
    wallet_address?: string;
    cdp_user_id?: string;  // Coinbase CDP user ID
    wallet_network?: 'base-sepolia' | 'base' | 'ethereum-sepolia' | 'ethereum';  // Network for the wallet
    
    // Optional future fields
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

    // Coinbase Wallet Integration
    wallet_address: {
        type: String,
        sparse: true,
        lowercase: true,
        trim: true,
        index: true
    },
    cdp_user_id: {
        type: String,
        sparse: true
    },
    wallet_network: {
        type: String,
        enum: ['base-sepolia', 'base', 'ethereum-sepolia', 'ethereum'],
        default: 'base-sepolia'
    },
    
    // Optional fields for future phases
    reputation_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    }
});

export default mongoose.model<IUser>('User', UserSchema);
