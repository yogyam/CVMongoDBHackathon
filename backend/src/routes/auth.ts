import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models';
import { generateToken } from '../utils/helpers';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, full_name } = req.body;

        // Validation
        if (!email || !password || !role || !full_name) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['email', 'password', 'role', 'full_name']
            });
            return;
        }

        if (!['CLIENT', 'FREELANCER'].includes(role)) {
            res.status(400).json({
                error: 'Invalid role',
                allowed: ['CLIENT', 'FREELANCER']
            });
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(409).json({ error: 'User already exists with this email' });
            return;
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email: email.toLowerCase(),
            password_hash,
            role,
            full_name
        });

        // Generate JWT
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['email', 'password']
            });
            return;
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate JWT
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me (verify token)
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-password_hash');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
});

// POST /api/auth/link-wallet (link Coinbase wallet to user account)
router.post('/link-wallet', async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { wallet_address, cdp_user_id, wallet_network } = req.body;

        // Validation
        if (!wallet_address) {
            res.status(400).json({ error: 'Wallet address is required' });
            return;
        }

        // Validate wallet address format (Ethereum address)
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
            res.status(400).json({ error: 'Invalid wallet address format' });
            return;
        }

        // Validate network if provided
        if (wallet_network && !['base-sepolia', 'base', 'ethereum-sepolia', 'ethereum'].includes(wallet_network)) {
            res.status(400).json({ 
                error: 'Invalid network',
                allowed: ['base-sepolia', 'base', 'ethereum-sepolia', 'ethereum']
            });
            return;
        }

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if wallet is already linked to another account
        const existingWallet = await User.findOne({ 
            wallet_address: wallet_address.toLowerCase(),
            _id: { $ne: user._id }
        });
        if (existingWallet) {
            res.status(409).json({ error: 'This wallet is already linked to another account' });
            return;
        }

        // Update user with wallet information
        user.wallet_address = wallet_address.toLowerCase();
        if (cdp_user_id) user.cdp_user_id = cdp_user_id;
        if (wallet_network) user.wallet_network = wallet_network;
        
        await user.save();

        res.status(200).json({
            message: 'Wallet linked successfully',
            user: {
                id: user._id,
                email: user.email,
                wallet_address: user.wallet_address,
                wallet_network: user.wallet_network,
                cdp_user_id: user.cdp_user_id
            }
        });
    } catch (error: any) {
        console.error('Link wallet error:', error);
        if (error.name === 'JsonWebTokenError') {
            res.status(403).json({ error: 'Invalid or expired token' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
