import { Request, Response } from 'express';
import { alertService } from '../services/alert.service';

export const alertController = {
    async getAll(req: Request, res: Response) {
        try {
            const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
            const alerts = await alertService.getAll(resolved);
            res.json(alerts);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getById(req: Request, res: Response) {
        try {
            const alert = await alertService.getById(req.params.id);
            if (!alert) return res.status(404).json({ error: 'Alert not found' });
            res.json(alert);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async create(req: Request, res: Response) {
        try {
            const alert = await alertService.create(req.body);
            res.status(201).json(alert);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async resolve(req: Request, res: Response) {
        try {
            const alert = await alertService.resolve(req.params.id);
            res.json(alert);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getStats(req: Request, res: Response) {
        try {
            const stats = await alertService.getStats();
            res.json(stats);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },
};
