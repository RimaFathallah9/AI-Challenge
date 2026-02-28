export interface MachineMonitoringData {
    machineId: string;
    machineName: string;
    machineType: string;
    currentMetrics: {
        power: number;
        temperature: number;
        vibration: number;
        runtime: number;
        production: number;
    };
    state: 'NORMAL' | 'WARNING' | 'CRITICAL';
    abnormalityScore: number;
}
export interface AnomalyDetectionResult {
    machineId: string;
    anomalyDetected: boolean;
    anomalyType: 'OVERHEAT' | 'VIBRATION' | 'LOAD_SPIKE' | 'EFFICIENCY_DROP' | 'NONE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number;
    description: string;
    affectedMetric: string;
    normalValue?: number;
    currentValue?: number;
    suggestedAction: string;
}
export interface PredictiveMaintenanceResult {
    machineId: string;
    failureProbability: number;
    estimatedRUL: number;
    failureType?: string;
    maintenanceType: 'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION_BASED';
    recommendedSchedule: {
        daysUntil: number;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        estimatedDowntime: number;
        estimatedCost: number;
    };
}
export interface EnergyOptimizationDecision {
    machineId: string;
    currentEnergyCost: number;
    baselineEnergy: number;
    optimizedEnergy: number;
    potentialSavings: number;
    recommendations: {
        action: string;
        impactPercentage: number;
        implementationTime: string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }[];
}
export interface AutonomousDecision {
    machineId: string;
    timestamp: Date;
    decision: 'CONTINUE' | 'REDUCE_LOAD' | 'ACTIVATE_COOLING' | 'SCHEDULE_MAINTENANCE' | 'STOP';
    confidence: number;
    dataPoints: {
        temperature: number;
        vibration: number;
        power: number;
        failureProbability: number;
        anomalyScore: number;
    };
    reasoning: {
        mainFactor: string;
        explanation: string;
        considerFactors: string[];
        safetyMargin: number;
    };
    actionableInsights: string[];
    estimatedImpact: {
        energySavings?: number;
        riskReduction?: number;
        costImpact: number;
    };
}
export interface AIAgentReport {
    machineId: string;
    machineName: string;
    reportTimestamp: Date;
    monitoring: MachineMonitoringData;
    anomalies: AnomalyDetectionResult[];
    predictiveMaintenance: PredictiveMaintenanceResult;
    energyOptimization: EnergyOptimizationDecision;
    autonomousDecision: AutonomousDecision;
    executiveSummary: {
        healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
        overallScore: number;
        keyIssues: string[];
        recommendedActions: string[];
        estimatedROI: number;
    };
}
export interface LearningData {
    machineId: string;
    decision: string;
    outcome: string;
    timestamp: Date;
    improvement: number;
    feedbackSource: 'HUMAN' | 'AUTOMATED' | 'SYSTEM_METRIC';
}
export declare const aiAgentService: {
    /**
     * 1️⃣ REAL-TIME INDUSTRIAL MONITORING
     * Continuously analyzes sensor data and classifies machine state
     */
    monitorMachine(machineId: string): Promise<MachineMonitoringData>;
    /**
     * 2️⃣ INTELLIGENT ANOMALY DETECTION
     * Detects overheating, energy spikes, and hidden abnormal patterns
     */
    detectAnomalies(machineId: string): Promise<AnomalyDetectionResult[]>;
    /**
     * 3️⃣ PREDICTIVE MAINTENANCE ENGINE
     * Predicts failures and recommends maintenance timing
     */
    predictMaintenance(machineId: string): Promise<PredictiveMaintenanceResult>;
    /**
     * 4️⃣ ENERGY OPTIMIZATION INTELLIGENCE
     * Suggests load balancing and energy-saving strategies
     */
    optimizeEnergy(machineId: string): Promise<EnergyOptimizationDecision>;
    /**
     * 5️⃣ AUTONOMOUS DECISION-MAKING SYSTEM
     * Makes intelligent decisions based on all factors
     */
    makeAutonomousDecision(machineId: string): Promise<AutonomousDecision>;
    /**
     * 6️⃣ EXPLAINABLE AI (XAI) LAYER
     * Generates executive summaries and human-readable insights
     */
    generateExplainableReport(machineId: string): Promise<AIAgentReport>;
    /**
     * 7️⃣ CONTINUOUS LEARNING SYSTEM
     * Records and learns from past decisions
     */
    recordDecisionFeedback(machineId: string, decision: string, outcome: string, improvement: number): Promise<LearningData>;
    /**
     * Retrieve learning history for a machine
     */
    getLearningHistory(machineId: string, limit?: number): Promise<LearningData[]>;
    /**
     * 8️⃣ MULTI-SOURCE DATA FUSION
     * Combines IoT + ERP/MES + optional vision data
     */
    fuseDataSources(machineId: string): Promise<{
        iotData: any;
        productionData: any;
        fused: any;
    }>;
    /**
     * Get comprehensive AI Agent status for all machines
     */
    getAgentStatus(factoryId?: string): Promise<AIAgentReport[]>;
};
//# sourceMappingURL=ai-agent.service.d.ts.map