import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRequirements {
    structured_brief: string;
    acceptance_criteria: string[];
    technical_stack: string[];
    estimated_hours: number;
    architect_reasoning: string;
}

export interface IRequirementsHistory {
    version: number;
    requirements: IRequirements;
    updated_at: Date;
    updated_by: Types.ObjectId;
    change_reason?: string;
    delta_analysis?: {
        cost_impact_usdc: number;
        hours_difference: number;
        scope_change: 'increase' | 'decrease' | 'modification';
        requires_approval: boolean;
        approved?: boolean;
        approved_at?: Date;
    };
}

export interface IProject extends Document {
    project_code: string;

    // Participants
    client_id: Types.ObjectId;
    freelancer_id?: Types.ObjectId;
    freelancer_email: string;

    // Project Details
    title: string;
    raw_description: string;

    // AI-Generated Requirements
    requirements?: IRequirements;
    requirements_history: IRequirementsHistory[];
    requirements_version: number;

    // Status Management
    status: 'CREATED' | 'REQUIREMENTS_GENERATED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'COMPLETED';

    // Quality Tracking
    current_revision: number;
    highest_score: number;

    // Budget & Delta Management
    original_budget_usdc: number;
    budget_usdc: number;
    released_usdc: number;
    pending_delta_approval?: {
        additional_cost_usdc: number;
        reason: string;
        requested_at: Date;
    };
    payment_status: 'ESCROWED' | 'PENDING_RELEASE' | 'RELEASED';

    // Timestamps
    created_at: Date;
    requirements_generated_at?: Date;
    started_at?: Date;
    completed_at?: Date;
}

const ProjectSchema = new Schema<IProject>({
    project_code: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Participants
    client_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    freelancer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    freelancer_email: {
        type: String,
        required: true,
        lowercase: true
    },

    // Project Details
    title: {
        type: String,
        required: true
    },
    raw_description: {
        type: String,
        required: true
    },

    // AI-Generated Requirements
    requirements: {
        structured_brief: String,
        acceptance_criteria: [String],
        technical_stack: [String],
        estimated_hours: Number,
        architect_reasoning: String
    },
    
    // Requirements History & Versioning
    requirements_history: [{
        version: {
            type: Number,
            required: true
        },
        requirements: {
            structured_brief: String,
            acceptance_criteria: [String],
            technical_stack: [String],
            estimated_hours: Number,
            architect_reasoning: String
        },
        updated_at: {
            type: Date,
            default: Date.now
        },
        updated_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        change_reason: String,
        delta_analysis: {
            cost_impact_usdc: {
                type: Number,
                default: 0
            },
            hours_difference: {
                type: Number,
                default: 0
            },
            scope_change: {
                type: String,
                enum: ['increase', 'decrease', 'modification'],
                default: 'modification'
            },
            requires_approval: {
                type: Boolean,
                default: false
            },
            approved: Boolean,
            approved_at: Date
        }
    }],
    requirements_version: {
        type: Number,
        default: 1
    },

    // Status Management
    status: {
        type: String,
        enum: ['CREATED', 'REQUIREMENTS_GENERATED', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'COMPLETED'],
        default: 'CREATED',
        index: true
    },

    // Quality Tracking
    current_revision: {
        type: Number,
        default: 0
    },
    highest_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
        index: true
    },

    // Budget & Delta Management
    original_budget_usdc: {
        type: Number,
        required: true,
        min: 0
    },
    budget_usdc: {
        type: Number,
        required: true,
        min: 0
    },
    released_usdc: {
        type: Number,
        default: 0,
        min: 0
    },
    pending_delta_approval: {
        additional_cost_usdc: {
            type: Number,
            min: 0
        },
        reason: String,
        requested_at: {
            type: Date,
            default: Date.now
        }
    },
    payment_status: {
        type: String,
        enum: ['ESCROWED', 'PENDING_RELEASE', 'RELEASED'],
        default: 'ESCROWED'
    },

    // Timestamps
    created_at: {
        type: Date,
        default: Date.now
    },
    requirements_generated_at: Date,
    started_at: Date,
    completed_at: Date
});

// Compound indexes for efficient queries
ProjectSchema.index({ client_id: 1, status: 1 });
ProjectSchema.index({ freelancer_id: 1, status: 1 });
ProjectSchema.index({ status: 1, highest_score: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
