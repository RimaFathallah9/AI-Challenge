import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import axios from 'axios';
import { config } from '../config/env';
import { prisma } from '../prisma/client';
import { geminiService } from '../services/gemini.service';

const router = Router();
router.use(authenticate);

// Forecast endpoint — proxies to AI microservice
router.post('/forecast', async (req, res) => {
    try {
        const { machineId, horizon } = req.body;
        const readings = await prisma.energyReading.findMany({
            where: { machineId },
            select: { power: true, timestamp: true },
            orderBy: { timestamp: 'asc' },
        });

        const response = await axios.post(`${config.aiServiceUrl}/forecast`, {
            data: readings.map(r => ({ ds: r.timestamp, y: r.power })),
            horizon: horizon || 24,
        });

        // Store prediction in DB
        await prisma.prediction.create({
            data: {
                machineId,
                type: horizon === 168 ? 'FORECAST_7D' : 'FORECAST_24H',
                value: response.data.predicted_total || 0,
                confidence: response.data.confidence || null,
            },
        });

        res.json(response.data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Anomaly detection
router.post('/anomaly', async (req, res) => {
    try {
        const { machineId } = req.body;
        const readings = await prisma.energyReading.findMany({
            where: { machineId },
            select: { power: true, voltage: true, current: true, temperature: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 200,
        });

        const response = await axios.post(`${config.aiServiceUrl}/anomaly`, { data: readings });
        res.json(response.data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Recommendations
router.post('/recommendations', async (req, res) => {
    try {
        const { machineId } = req.body;
        const [readings, alerts] = await Promise.all([
            prisma.energyReading.findMany({ where: { machineId }, orderBy: { timestamp: 'desc' }, take: 100 }),
            prisma.alert.findMany({ where: { machineId, resolved: false } }),
        ]);

        const response = await axios.post(`${config.aiServiceUrl}/recommendations`, {
            machineId, readings, alerts,
        });

        // Store recommendations
        const recs = response.data.recommendations || [];
        for (const rec of recs) {
            await prisma.recommendation.create({
                data: { machineId, content: rec.content, savings: rec.savings || null },
            });
        }

        res.json(response.data);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Chatbot — POST /api/ai/chat ─────────────────────────────────────────────
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });

        // Build live context for the AI
        let recentAIActions: any[] = [];
        try {
            if ((prisma as any).aIDecisionLog) {
                recentAIActions = await (prisma as any).aIDecisionLog.findMany({
                    take: 3,
                    orderBy: { timestamp: 'desc' },
                });
            }
        } catch (e) {
            console.log('[Chat API] Unable to fetch AI decision logs context (model not generated yet)');
        }

        const machines = await prisma.machine.findMany({
            select: { name: true, status: true, type: true },
            take: 20,
        });

        const context = {
            machines,
            recentAutonomousDecisions: (recentAIActions as any[]).map(d => ({
                anomaly: d.anomalyType,
                action: d.actionTaken,
                reasoning: d.reasoningSummary,
            })),
            time: new Date().toISOString(),
        };

        const reply = await geminiService.chat(message, context);
        res.json({ reply });
    } catch (error: any) {
        console.error('[Chat API Error]', error);
        res.status(500).json({ error: 'Failed to communicate with AI chat.', detail: error.message });
    }
});

export default router;
