"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("../prisma/client");
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDt6C_r1k89bUNPXDgnbu6fFS742cCApU0';
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
exports.geminiService = {
    /**
     * The Core AI Brain. Evaluates machine reading anomalies and makes autonomous decisions.
     */
    async evaluateAnomaly(machineId, machineName, machineType, anomalyType, currentReading) {
        try {
            console.log(`🤖 [Gemini AI Agent] Evaluating ${anomalyType} on ${machineName}...`);
            // 1. Gather Context
            const recentLogs = await client_1.prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 10,
            });
            const context = {
                machine: { id: machineId, name: machineName, type: machineType },
                anomaly: anomalyType,
                currentMetrics: currentReading,
                recentTrend: recentLogs,
            };
            // 2. Prompt Gemini for autonomous reasoning
            const prompt = `
                You are NEXOVA, an Autonomous Industrial AI Agent. You supervise industrial machines.
                An anomaly flag (${anomalyType}) was just triggered for machine "${machineName}" (Type: ${machineType}).
                
                Current Live Metrics: ${JSON.stringify(currentReading)}
                
                Your objective is to evaluate this machine context safely and decide on an autonomous action.
                
                Rules for actions you can take:
                - Overheating -> Return "MAINTENANCE" to simulate cooling/A-C.
                - Power Spike -> Return "OFFLINE" to emergency stop the machine immediately.
                - Predictive Failure (Vibration) -> Return "NONE" but set risk to "WARNING" and notify technician in recommendation.
                
                Return exactly a JSON object matching this structure:
                {
                    "rootCause": "string describing the likely engineering cause",
                    "riskLevel": "INFO", "WARNING", or "CRITICAL",
                    "actionTaken": "MAINTENANCE", "OFFLINE" or "NONE",
                    "reasoning": "string explaining why this action is the safest protocol",
                    "estimatedSavings": number (KwH saved by intervening),
                    "preventedLoss": number (Estimated $ saved from avoided damage),
                    "humanRecommendation": "string - what human personnel should do next"
                }
            `;
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            if (!responseText)
                throw new Error("Empty response from Gemini");
            const decision = JSON.parse(responseText);
            // 3. Execute Autonomous Action
            if (decision.actionTaken !== 'NONE') {
                await client_1.prisma.machine.update({
                    where: { id: machineId },
                    data: { status: decision.actionTaken },
                });
            }
            // 4. Log Explainability Audit Trail
            await client_1.prisma.aIDecisionLog.create({
                data: {
                    machineId,
                    contextSnapshot: JSON.stringify(context),
                    anomalyType,
                    reasoningSummary: decision.reasoning,
                    actionTaken: decision.actionTaken,
                    estimatedSavings: decision.estimatedSavings,
                    preventedLoss: decision.preventedLoss,
                }
            });
            // 5. Broadcast human alert
            await client_1.prisma.alert.create({
                data: {
                    machineId,
                    message: `[AI Action: ${decision.actionTaken}] ${anomalyType} resolved autonomously.`,
                    details: `Root Cause: ${decision.rootCause}\nReasoning: ${decision.reasoning}\nRecommendation: ${decision.humanRecommendation}`,
                    severity: decision.riskLevel, // Map roughly
                }
            });
            console.log(`✅ [Gemini AI Agent] Action executed: ${decision.actionTaken}`);
        }
        catch (error) {
            console.error(`🚨 [Gemini AI Agent] Core Failure during evaluation:`, error);
        }
    },
    /**
     * Dedicated Chat API for the Frontend Assistant Widget
     */
    async chat(message, context) {
        try {
            console.log('[Gemini Chat] Starting chat request with message:', message);
            const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `
                You are NEXOVA AI, an intelligent industrial assistant.
                You help technicians and administrators manage their factory floor.
                
                Context about the app right now:
                ${JSON.stringify(context || {})}
                
                User Message: "${message}"
                
                Respond concisely, using markdown as needed. Explain industrial concepts clearly.
            `;
            console.log('[Gemini Chat] Sending prompt to Gemini...');
            const result = await chatModel.generateContent(prompt);
            if (!result || !result.response) {
                throw new Error('No response from Gemini API');
            }
            const response = result.response.text();
            console.log('[Gemini Chat] Got response from Gemini');
            return response;
        }
        catch (e) {
            console.error('[Gemini Chat Error]', e.message || e);
            // Fallback response if Gemini API is not available or API key is invalid
            console.log('[Gemini Chat] Using fallback response due to API error');
            const fallbackResponse = exports.geminiService.generateFallbackResponse(message, context);
            return fallbackResponse;
        }
    },
    /**
     * Generates a helpful fallback response when Gemini API is unavailable
     */
    generateFallbackResponse(message, context) {
        const lowerMessage = message.toLowerCase();
        const machines = context?.machines || [];
        const recentDecisions = context?.recentAutonomousDecisions || [];
        if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
            return `Hello! I'm NEXOVA AI. I can help you with:
- 📊 Energy analytics and consumption trends
- 🤖 Machine status and performance monitoring
- ⚠️ Alert management and anomaly detection
- 💡 Energy efficiency recommendations
- 📈 Predictive forecasts for power consumption

What would you like to know?`;
        }
        if (lowerMessage.includes('machine') || lowerMessage.includes('status')) {
            return `I can see ${machines.length} machines in your factory:
${machines.map((m) => `- **${m.name}** (${m.type}): ${m.status}`).join('\n')}

Would you like more details about any specific machine?`;
        }
        if (lowerMessage.includes('energy') || lowerMessage.includes('power') || lowerMessage.includes('consumption')) {
            return `Energy consumption is one of the key focus areas of NEXOVA. I can help you:
- View current power usage across machines
- Analyze historical energy trends
- Get recommendations for reducing consumption
- Predict future energy needs

What specific aspect interests you?`;
        }
        if (lowerMessage.includes('alert') || lowerMessage.includes('error') || lowerMessage.includes('issue')) {
            return `I can help monitor and manage alerts. Currently, I'm tracking:
- System health and anomalies
- Machine performance issues
- Energy usage spikes
- Predictive maintenance warnings

Would you like me to show you recent alerts or recommendations?`;
        }
        // Default response
        return `I'm NEXOVA AI, your industrial intelligence assistant. I can help you monitor and optimize your factory operations. Please ask me about:
- Machine performance
- Energy consumption
- Alerts and anomalies
- Efficiency recommendations

How can I assist you?`;
    }
};
//# sourceMappingURL=gemini.service.js.map