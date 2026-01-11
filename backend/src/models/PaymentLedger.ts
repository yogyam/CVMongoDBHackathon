import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPaymentLedger extends Document {
    project_id: Types.ObjectId;
    
    transaction_type: 'ESCROW_DEPOSIT' | 'MILESTONE_RELEASE' | 'DELTA_TOPUP' | 'FINAL_SETTLEMENT';
    amount_usdc: number;
    
    // x402 Integration
    x402_stream_id?: string;
    x402_facilitator_url?: string;
    coinbase_tx_hash?: string;
    
    // State
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    
    triggered_by: 'PAYMENT_AGENT' | 'CLIENT_APPROVAL' | 'MANUAL';
    created_at: Date;
    confirmed_at?: Date;
    notes?: string;
}

const PaymentLedgerSchema = new Schema<IPaymentLedger>({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    
    transaction_type: {
        type: String,
        enum: ['ESCROW_DEPOSIT', 'MILESTONE_RELEASE', 'DELTA_TOPUP', 'FINAL_SETTLEMENT'],
        required: true,
        index: true
    },
    amount_usdc: {
        type: Number,
        required: true,
        min: 0
    },
    
    // x402 Integration
    x402_stream_id: {
        type: String,
        sparse: true
    },
    x402_facilitator_url: {
        type: String,
        default: 'https://api.coinbase.com/x402'
    },
    coinbase_tx_hash: {
        type: String,
        sparse: true,
        lowercase: true
    },
    
    // State
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'FAILED'],
        default: 'PENDING',
        index: true
    },
    
    triggered_by: {
        type: String,
        enum: ['PAYMENT_AGENT', 'CLIENT_APPROVAL', 'MANUAL'],
        default: 'MANUAL'
    },
    
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    confirmed_at: {
        type: Date
    },
    notes: {
        type: String
    }
});

// Compound indexes
PaymentLedgerSchema.index({ project_id: 1, status: 1 });
PaymentLedgerSchema.index({ project_id: 1, transaction_type: 1 });

export default mongoose.model<IPaymentLedger>('PaymentLedger', PaymentLedgerSchema);
