"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const client_1 = require("../prisma/client");
const gemini_service_1 = require("../services/gemini.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Forecast endpoint — proxies to AI microservice
router.post('/forecast', async (req, res) => {
    try {
        const { machineId, horizon } = req.body;
        const readings = await client_1.prisma.energyReading.findMany({
            where: { machineId },
            select: { power: true, timestamp: true },
            orderBy: { timestamp: 'asc' },
        });
        const response = await axios_1.default.post(`${env_1.config.aiServiceUrl}/forecast`, {
            data: readings.map(r => ({ ds: r.timestamp, y: r.power })),
            horizon: horizon || 24,
        });
        // Store prediction in DB
        await client_1.prisma.prediction.create({
            data: {
                machineId,
                type: horizon === 168 ? 'FORECAST_7D' : 'FORECAST_24H',
                value: response.data.predicted_total || 0,
                confidence: response.data.confidence || null,
            },
        });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Anomaly detection
router.post('/anomaly', async (req, res) => {
    try {
        const { machineId } = req.body;
        const readings = await client_1.prisma.energyReading.findMany({
            where: { machineId },
            select: { power: true, voltage: true, current: true, temperature: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 200,
        });
        const response = await axios_1.default.post(`${env_1.config.aiServiceUrl}/anomaly`, { data: readings });
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Recommendations
router.post('/recommendations', async (req, res) => {
    try {
        const { machineId } = req.body;
        const [readings, alerts] = await Promise.all([
            client_1.prisma.energyReading.findMany({ where: { machineId }, orderBy: { timestamp: 'desc' }, take: 100 }),
            client_1.prisma.alert.findMany({ where: { machineId, resolved: false } }),
        ]);
        const response = await axios_1.default.post(`${env_1.config.aiServiceUrl}/recommendations`, {
            machineId, readings, alerts,
        });
        // Store recommendations
        const recs = response.data.recommendations || [];
        for (const rec of recs) {
            await client_1.prisma.recommendation.create({
                data: { machineId, content: rec.content, savings: rec.savings || null },
            });
        }
        res.json(response.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ── Chatbot — POST /api/ai/chat ─────────────────────────────────────────────
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message)
            return res.status(400).json({ error: 'message is required' });
        // Build live context for the AI
        let recentAIActions = [];
        try {
            if (client_1.prisma.aIDecisionLog) {
                recentAIActions = await client_1.prisma.aIDecisionLog.findMany({
                    take: 3,
                    orderBy: { timestamp: 'desc' },
                });
            }
        }
        catch (e) {
            console.log('[Chat API] Unable to fetch AI decision logs context (model not generated yet)');
        }
        const machines = await client_1.prisma.machine.findMany({
            select: { name: true, status: true, type: true },
            take: 20,
        });
        const context = {
            machines,
            recentAutonomousDecisions: recentAIActions.map(d => ({
                anomaly: d.anomalyType,
                action: d.actionTaken,
                reasoning: d.reasoningSummary,
            })),
            time: new Date().toISOString(),
        };
        const reply = await gemini_service_1.geminiService.chat(message, context);
        res.json({ reply });
    }
    catch (error) {
        console.error('[Chat API Error]', error);
        res.status(500).json({ error: 'Failed to communicate with AI chat.', detail: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=ai.routes.js.map