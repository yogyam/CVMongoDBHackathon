import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface IConversation extends Document {
    project_id: Types.ObjectId;
    client_id: Types.ObjectId;

    // Conversation state
    messages: IMessage[];
    status: 'GATHERING_INFO' | 'READY_TO_GENERATE' | 'COMPLETED';

    // Gathered information
    gathered_info: {
        has_tech_stack: boolean;
        has_features: boolean;
        has_timeline: boolean;
        has_design_preferences: boolean;
        questions_asked: number;
    };

    // Timestamps
    started_at: Date;
    last_message_at: Date;
    completed_at?: Date;
}

const ConversationSchema = new Schema<IConversation>({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        unique: true,
        index: true
    },
    client_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    status: {
        type: String,
        enum: ['GATHERING_INFO', 'READY_TO_GENERATE', 'COMPLETED'],
        default: 'GATHERING_INFO'
    },

    gathered_info: {
        has_tech_stack: { type: Boolean, default: false },
        has_features: { type: Boolean, default: false },
        has_timeline: { type: Boolean, default: false },
        has_design_preferences: { type: Boolean, default: false },
        questions_asked: { type: Number, default: 0 }
    },

    started_at: {
        type: Date,
        default: Date.now
    },
    last_message_at: {
        type: Date,
        default: Date.now
    },
    completed_at: Date
});

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
