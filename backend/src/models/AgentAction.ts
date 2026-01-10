import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAgentAction extends Document {
    timestamp: Date;

    // Agent Identity
    agent: 'ARCHITECT' | 'CRITIC' | 'MEDIATOR';
    action: string;

    // Context
    project_id: Types.ObjectId;
    revision_id?: Types.ObjectId;

    // Reasoning (for audit/debugging)
    reasoning: string;
    confidence: number;

    // Metadata
    model_used: string;
    latency_ms: number;
    tokens_used?: number;

    // Result (flexible field)
    result: any;
}

const AgentActionSchema = new Schema<IAgentAction>({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Agent Identity
    agent: {
        type: String,
        enum: ['ARCHITECT', 'CRITIC', 'MEDIATOR'],
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },

    // Context
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    revision_id: {
        type: Schema.Types.ObjectId,
        ref: 'Revision'
    },

    // Reasoning
    reasoning: {
        type: String,
        default: ''
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },

    // Metadata
    model_used: {
        type: String,
        default: 'firefunction-v1'
    },
    latency_ms: {
        type: Number,
        default: 0
    },
    tokens_used: {
        type: Number
    },

    // Result (schema-less for flexibility)
    result: {
        type: Schema.Types.Mixed,
        default: {}
    }
});

// Indexes
AgentActionSchema.index({ project_id: 1, timestamp: -1 });
AgentActionSchema.index({ agent: 1, action: 1 });

export default mongoose.model<IAgentAction>('AgentAction', AgentActionSchema);
