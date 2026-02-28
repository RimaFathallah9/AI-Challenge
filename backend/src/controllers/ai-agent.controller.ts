import { Request, Response } from 'express';
import { aiAgentService } from '../services/ai-agent.service';

export const aiAgentController = {
    /**
     * GET /api/ai-agent/machines/:machineId/monitor
     * Real-time machine monitoring and state classification
     */
    async monitorMachine(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const monitoring = await aiAgentService.monitorMachine(machineId);

            res.json({
                success: true,
                data: monitoring,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Monitor error:', error);
            res.status(error.message.includes('not found') ? 404 : 500).json({
                error: error.message,
                feature: '1️⃣ Real-Time Industrial Monitoring',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/anomalies
     * Intelligent anomaly detection
     */
    async detectAnomalies(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const anomalies = await aiAgentService.detectAnomalies(machineId);

            res.json({
                success: true,
                anomaliesDetected: anomalies.length > 0,
                count: anomalies.length,
                data: anomalies,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Anomaly detection error:', error);
            res.status(500).json({
                error: error.message,
                feature: '2️⃣ Intelligent Anomaly Detection',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/maintenance
     * Predictive maintenance engine
     */
    async predictMaintenance(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const maintenance = await aiAgentService.predictMaintenance(machineId);

            res.json({
                success: true,
                data: maintenance,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Predictive maintenance error:', error);
            res.status(500).json({
                error: error.message,
                feature: '3️⃣ Predictive Maintenance Engine',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/optimize-energy
     * Energy optimization intelligence
     */
    async optimizeEnergy(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const optimization = await aiAgentService.optimizeEnergy(machineId);

            res.json({
                success: true,
                energySavingsPotential: optimization.potentialSavings,
                data: optimization,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Energy optimization error:', error);
            res.status(500).json({
                error: error.message,
                feature: '4️⃣ Energy Optimization Intelligence',
            });
        }
    },

    /**
     * POST /api/ai-agent/machines/:machineId/decide
     * Autonomous decision-making system
     */
    async makeDecision(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const decision = await aiAgentService.makeAutonomousDecision(machineId);

            res.json({
                success: true,
                decision: decision.decision,
                confidence: decision.confidence,
                data: decision,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Decision making error:', error);
            res.status(500).json({
                error: error.message,
                feature: '5️⃣ Autonomous Decision-Making System',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/report
     * Explainable AI (XAI) report with human-readable insights
     */
    async generateReport(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const report = await aiAgentService.generateExplainableReport(machineId);

            res.json({
                success: true,
                healthStatus: report.executiveSummary.healthStatus,
                overallScore: report.executiveSummary.overallScore,
                data: report,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Report generation error:', error);
            res.status(500).json({
                error: error.message,
                feature: '6️⃣ Explainable AI (XAI) Layer',
            });
        }
    },

    /**
     * POST /api/ai-agent/machines/:machineId/feedback
     * Record decision feedback for continuous learning
     */
    async recordFeedback(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;
            const { decision, outcome, improvement } = req.body;

            if (!decision || !outcome || improvement === undefined) {
                res.status(400).json({
                    error: 'Missing required fields: decision, outcome, improvement',
                });
                return;
            }

            if (typeof improvement !== 'number' || improvement < -1 || improvement > 1) {
                res.status(400).json({
                    error: 'Improvement must be a number between -1 and 1',
                });
                return;
            }

            const learning = await aiAgentService.recordDecisionFeedback(
                machineId,
                decision,
                outcome,
                improvement
            );

            res.json({
                success: true,
                message: 'Feedback recorded for continuous learning',
                data: learning,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Feedback error:', error);
            res.status(500).json({
                error: error.message,
                feature: '7️⃣ Continuous Learning System',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/history
     * Learning history for a machine
     */
    async getLearningHistory(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;

            const history = await aiAgentService.getLearningHistory(machineId, limit);

            res.json({
                success: true,
                count: history.length,
                data: history,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] History error:', error);
            res.status(500).json({
                error: error.message,
                feature: '7️⃣ Continuous Learning System',
            });
        }
    },

    /**
     * GET /api/ai-agent/machines/:machineId/fuse
     * Multi-source data fusion
     */
    async fuseData(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.params;

            const fused = await aiAgentService.fuseDataSources(machineId);

            res.json({
                success: true,
                data: fused,
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Data fusion error:', error);
            res.status(500).json({
                error: error.message,
                feature: '8️⃣ Multi-Source Data Fusion',
            });
        }
    },

    /**
     * GET /api/ai-agent/status
     * Comprehensive AI Agent status for all machines
     */
    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const factoryId = req.query.factoryId as string | undefined;

            const reports = await aiAgentService.getAgentStatus(factoryId);

            // Summary statistics
            const healthyCount = reports.filter(r => r.executiveSummary.healthStatus === 'HEALTHY').length;
            const atRiskCount = reports.filter(r => r.executiveSummary.healthStatus === 'AT_RISK').length;
            const criticalCount = reports.filter(r => r.executiveSummary.healthStatus === 'CRITICAL').length;
            const avgScore = reports.reduce((sum, r) => sum + r.executiveSummary.overallScore, 0) / Math.max(1, reports.length);
            const totalSavingsPotential = reports.reduce((sum, r) => sum + r.energyOptimization.potentialSavings, 0);

            res.json({
                success: true,
                summary: {
                    totalMachines: reports.length,
                    healthy: healthyCount,
                    atRisk: atRiskCount,
                    critical: criticalCount,
                    avgHealthScore: Math.round(avgScore * 100) / 100,
                    totalEnergySavingsPotential: Math.round(totalSavingsPotential * 100) / 100,
                },
                machines: reports.map(r => ({
                    machineId: r.machineId,
                    machineName: r.machineName,
                    healthStatus: r.executiveSummary.healthStatus,
                    overallScore: r.executiveSummary.overallScore,
                    keyIssues: r.executiveSummary.keyIssues,
                    recommendedActions: r.executiveSummary.recommendedActions.slice(0, 2), // Top 2 actions
                })),
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Status error:', error);
            res.status(500).json({
                error: error.message,
            });
        }
    },

    /**
     * GET /api/ai-agent/dashboard
     * Complete AI Agent dashboard with all insights
     */
    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { machineId } = req.query;

            if (!machineId || typeof machineId !== 'string') {
                res.status(400).json({
                    error: 'Machine ID required as query parameter',
                });
                return;
            }

            // Gather all 8 feature outputs
            const [monitoring, anomalies, maintenance, energy, decision, report, fused] = await Promise.all([
                aiAgentService.monitorMachine(machineId),
                aiAgentService.detectAnomalies(machineId),
                aiAgentService.predictMaintenance(machineId),
                aiAgentService.optimizeEnergy(machineId),
                aiAgentService.makeAutonomousDecision(machineId),
                aiAgentService.generateExplainableReport(machineId),
                aiAgentService.fuseDataSources(machineId),
            ]);

            res.json({
                success: true,
                machineId,
                executiveReport: {
                    healthStatus: report.executiveSummary.healthStatus,
                    overallScore: report.executiveSummary.overallScore,
                    keyIssues: report.executiveSummary.keyIssues,
                    recommendedActions: report.executiveSummary.recommendedActions,
                    estimatedROI: report.executiveSummary.estimatedROI,
                },
                features: {
                    '1_monitoring': {
                        state: monitoring.state,
                        abnormalityScore: monitoring.abnormalityScore,
                        metrics: monitoring.currentMetrics,
                    },
                    '2_anomalies': {
                        detected: anomalies.length,
                        anomalies: anomalies,
                    },
                    '3_maintenance': {
                        failureProbability: maintenance.failureProbability,
                        estimatedRUL: maintenance.estimatedRUL,
                        schedule: maintenance.recommendedSchedule,
                    },
                    '4_energy': {
                        potentialSavings: energy.potentialSavings,
                        recommendations: energy.recommendations,
                    },
                    '5_decision': {
                        decision: decision.decision,
                        confidence: decision.confidence,
                        reasoning: decision.reasoning,
                        actionableInsights: decision.actionableInsights,
                    },
                    '6_xai': {
                        explanation: report.autonomousDecision.reasoning.explanation,
                        factors: report.autonomousDecision.reasoning.considerFactors,
                    },
                    '8_fusion': {
                        operationalMetrics: fused.fused.operationalMetrics,
                        integratedInsights: fused.fused.integratedInsights,
                    },
                },
                timestamp: new Date(),
            });
        } catch (error: any) {
            console.error('[AI Agent Controller] Dashboard error:', error);
            res.status(500).json({
                error: error.message,
            });
        }
    },
};
