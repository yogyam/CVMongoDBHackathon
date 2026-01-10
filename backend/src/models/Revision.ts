import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFile {
    filename: string;
    content: string;
    language: string;
}

export interface IRevision extends Document {
    project_id: Types.ObjectId;
    revision_number: number;

    // Submission
    submitted_by: Types.ObjectId;
    submitted_at: Date;

    // Work Content
    files: IFile[];
    notes: string;

    // Critic Evaluation
    critic_score: number;
    critic_feedback: string;
    critique_reasoning: string;
    blockers: string[];
    suggestions: string[];

    // Visibility Control (The Gatekeeper Logic)
    visible_to_client: boolean;
    client_notified: boolean;

    // Status
    status: 'PENDING_REVIEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
    client_response?: string;
    responded_at?: Date;
}

const RevisionSchema = new Schema<IRevision>({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    revision_number: {
        type: Number,
        required: true,
        min: 1
    },

    // Submission
    submitted_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submitted_at: {
        type: Date,
        default: Date.now
    },

    // Work Content
    files: [{
        filename: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        language: {
            type: String,
            required: true
        }
    }],
    notes: {
        type: String,
        default: ''
    },

    // Critic Evaluation
    critic_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
        index: true
    },
    critic_feedback: {
        type: String,
        default: ''
    },
    critique_reasoning: {
        type: String,
        default: ''
    },
    blockers: {
        type: [String],
        default: []
    },
    suggestions: {
        type: [String],
        default: []
    },

    // Visibility Control
    visible_to_client: {
        type: Boolean,
        default: false,
        index: true
    },
    client_notified: {
        type: Boolean,
        default: false
    },

    // Status
    status: {
        type: String,
        enum: ['PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED'],
        default: 'PENDING_REVIEW',
        index: true
    },
    client_response: String,
    responded_at: Date
});

// Compound indexes
RevisionSchema.index({ project_id: 1, revision_number: 1 }, { unique: true });
RevisionSchema.index({ project_id: 1, visible_to_client: 1 });
RevisionSchema.index({ status: 1, critic_score: 1 });

export default mongoose.model<IRevision>('Revision', RevisionSchema);
