import jwt from 'jsonwebtoken';
import { JWTPayload } from '../middleware/auth';

export const generateToken = (payload: JWTPayload): string => {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }

    return jwt.sign(payload, jwtSecret, {
        expiresIn: '7d' // Token expires in 7 days
    });
};

export const generateProjectCode = async (Project: any): Promise<string> => {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        // Get the highest existing project code number
        const lastProject = await Project.findOne(
            { project_code: { $regex: /^SYN-\d{3}$/ } },
            { project_code: 1 }
        ).sort({ project_code: -1 }).limit(1);
        
        let nextNumber = 1;
        if (lastProject?.project_code) {
            const match = lastProject.project_code.match(/SYN-(\d{3})/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        
        // Add some randomization to avoid conflicts in concurrent scenarios
        const offset = attempts > 0 ? Math.floor(Math.random() * 100) : 0;
        code = `SYN-${String(nextNumber + offset).padStart(3, '0')}`;
        
        // Check if this code already exists
        const existing = await Project.findOne({ project_code: code });
        if (!existing) {
            break;
        }
        
        attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
        // Fallback to timestamp-based code
        code = `SYN-${Date.now().toString().slice(-6)}`;
    }
    
    return code;
};
