"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatController = void 0;
const gemini_service_1 = require("../services/gemini.service");
const client_1 = require("../prisma/client");
exports.chatController = {
    async interact(req, res) {
        try {
            const { message } = req.body;
            // Gather context about the whole factory for the chatbot
            const machines = await client_1.prisma.machine.findMany({ select: { name: true, status: true, type: true } });
            const recentAIActions = await client_1.prisma.aIDecisionLog.findMany({ take: 3, orderBy: { timestamp: 'desc' } });
            const context = {
                machines,
                recentAutonomousDecisions: recentAIActions.map((d) => ({ anomaly: d.anomalyType, action: d.actionTaken, reasoning: d.reasoningSummary })),
                time: new Date().toISOString()
            };
            const reply = await gemini_service_1.geminiService.chat(message, context);
            res.status(200).json({ reply });
        }
        catch (error) {
            console.error('[Chat API Error]', error);
            res.status(500).json({ error: 'Failed to communicate with AI chat.' });
        }
    },
};
//# sourceMappingURL=chat.controller.js.map