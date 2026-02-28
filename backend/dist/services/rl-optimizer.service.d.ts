export interface RLState {
    machineId: string;
    machineName: string;
    currentPowerUsage: number;
    optimalPowerUsage: number;
    potentialSavings: number;
    moneySavings: number;
    efficiency: number;
    recommendation: string;
    actionTaken: string;
    confidence: number;
}
export interface RLAnalysis {
    totalMachines: number;
    averageEfficiency: number;
    totalPotentialSavings: number;
    totalMoneySavings: number;
    recommendations: RLState[];
    topOpportunities: RLState[];
    learningProgress: number;
}
export declare const rlOptimizerService: {
    /**
     * Analyze machine readings and generate optimal energy strategies
     * Uses reinforcement learning principles to learn best energy patterns
     */
    analyzeAndOptimize(): Promise<RLAnalysis>;
    /**
     * Generate simulated RL training data and recommendations
     */
    generateRLTrainingData(): Promise<void>;
    /**
     * Get actionable recommendations for cost optimization
     */
    getOptimizationRecommendations(): Promise<{
        analysis: RLAnalysis;
        recommendations: {
            title: string;
            description: string;
            impact: string;
            priority: string;
        }[];
        projectedAnnualSavings: number;
    }>;
};
//# sourceMappingURL=rl-optimizer.service.d.ts.map