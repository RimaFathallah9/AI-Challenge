import { Request, Response } from 'express';
import { energyService } from '../services/energy.service';

export const energyController = {
    async ingest(req: Request, res: Response) {
        try {
            const reading = await energyService.ingest(req.body);
            res.status(201).json(reading);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getHistory(req: Request, res: Response) {
        try {
            const { machineId } = req.params;
            const hours = parseInt(req.query.hours as string) || 24;
            const data = await energyService.getHistory(machineId, hours);
            res.json(data);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getDashboardStats(req: Request, res: Response) {
        try {
            const stats = await energyService.getDashboardStats();
            res.json(stats);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getMonthlyTrend(req: Request, res: Response) {
        try {
            const trend = await energyService.getMonthlyTrend();
            res.json(trend);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },
};
