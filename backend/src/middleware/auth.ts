import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'CLIENT' | 'FREELANCER';
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (roles: ('CLIENT' | 'FREELANCER')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `This action requires role: ${roles.join(' or ')}`
            });
            return;
        }

        next();
    };
};
