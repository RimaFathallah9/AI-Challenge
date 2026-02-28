import { Request, Response } from 'express';
export declare const aiAgentController: {
    /**
     * GET /api/ai-agent/machines/:machineId/monitor
     * Real-time machine monitoring and state classification
     */
    monitorMachine(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/anomalies
     * Intelligent anomaly detection
     */
    detectAnomalies(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/maintenance
     * Predictive maintenance engine
     */
    predictMaintenance(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/optimize-energy
     * Energy optimization intelligence
     */
    optimizeEnergy(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/ai-agent/machines/:machineId/decide
     * Autonomous decision-making system
     */
    makeDecision(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/report
     * Explainable AI (XAI) report with human-readable insights
     */
    generateReport(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/ai-agent/machines/:machineId/feedback
     * Record decision feedback for continuous learning
     */
    recordFeedback(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/history
     * Learning history for a machine
     */
    getLearningHistory(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/machines/:machineId/fuse
     * Multi-source data fusion
     */
    fuseData(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/status
     * Comprehensive AI Agent status for all machines
     */
    getStatus(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/ai-agent/dashboard
     * Complete AI Agent dashboard with all insights
     */
    getDashboard(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=ai-agent.controller.d.ts.map