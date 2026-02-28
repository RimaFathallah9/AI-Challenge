import { Request, Response } from 'express';
import { rlOptimizerService } from '../services/rl-optimizer.service';

export const rlController = {
    async analyze(req: Request, res: Response) {
        try {
            const analysis = await rlOptimizerService.analyzeAndOptimize();
            res.json(analysis);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async getRecommendations(req: Request, res: Response) {
        try {
            const result = await rlOptimizerService.getOptimizationRecommendations();
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async generateTrainingData(req: Request, res: Response) {
        try {
            await rlOptimizerService.generateRLTrainingData();
            res.json({ success: true, message: 'RL training data generated successfully' });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },
};
