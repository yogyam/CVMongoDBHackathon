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

export const generateProjectCode = (count: number): string => {
    return `SYN-${String(count + 1).padStart(3, '0')}`;
};
