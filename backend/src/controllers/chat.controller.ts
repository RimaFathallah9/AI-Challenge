import { Request, Response } from 'express';
import { geminiService } from '../services/gemini.service';
import { prisma } from '../prisma/client';

export const chatController = {
    async interact(req: Request, res: Response) {
        try {
            const { message } = req.body;

            // Gather context about the whole factory for the chatbot
            const machines = await prisma.machine.findMany({ select: { name: true, status: true, type: true } });
            const recentAIActions = await prisma.aIDecisionLog.findMany({ take: 3, orderBy: { timestamp: 'desc' } });

            const context = {
                machines,
                recentAutonomousDecisions: recentAIActions.map((d: any) => ({ anomaly: d.anomalyType, action: d.actionTaken, reasoning: d.reasoningSummary })),
                time: new Date().toISOString()
            };

            const reply = await geminiService.chat(message, context);

            res.status(200).json({ reply });
        } catch (error) {
            console.error('[Chat API Error]', error);
            res.status(500).json({ error: 'Failed to communicate with AI chat.' });
        }
    },
};
