import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { Role } from '@prisma/client';

export const authController = {
    async register(req: Request, res: Response) {
        try {
            const { email, password, name, role, factoryId } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const result = await authService.register({ email, password, name, role: role as Role, factoryId });
            return res.status(201).json(result);
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    },

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const result = await authService.login({ email, password });
            return res.status(200).json(result);
        } catch (err: any) {
            return res.status(401).json({ error: err.message });
        }
    },

    async refresh(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
            const tokens = await authService.refreshToken(refreshToken);
            return res.status(200).json(tokens);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
    },

    async me(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const profile = await authService.getProfile(userId);
            if (!profile) return res.status(404).json({ error: 'User not found' });
            return res.status(200).json(profile);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    },
};
