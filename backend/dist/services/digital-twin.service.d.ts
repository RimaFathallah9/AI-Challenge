export interface ProductionSimulationInput {
    machineId: string;
    operationHours: number;
    targetProduction: number;
    materialType?: string;
    materialQuantity?: number;
}
export interface EnergyOptimizationResult {
    machineId: string;
    machineName: string;
    machineType: string;
    scenario: {
        operationHours: number;
        targetProduction: number;
        materialUsed: number;
        materialType: string;
    };
    baselineMetrics: {
        totalEnergyConsumption: number;
        energyCost: number;
        materialWaste: number;
        materialCost: number;
        totalCost: number;
        costPerUnit: number;
        co2Emissions: number;
    };
    optimizedMetrics: {
        totalEnergyConsumption: number;
        energyCost: number;
        materialWaste: number;
        materialCost: number;
        totalCost: number;
        costPerUnit: number;
        co2Emissions: number;
    };
    savings: {
        energySavings: number;
        moneySavings: number;
        wasteReduction: number;
        percentageSavings: number;
        co2Reduction: number;
    };
    recommendations: OptimizationRecommendation[];
    riskAssessment: {
        failureProbability: number;
        qualityImpact: string;
        recommendation: string;
    };
    confidenceScore: number;
}
export interface OptimizationRecommendation {
    title: string;
    description: string;
    estimatedSavings: number;
    implementationTime: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    impact: string;
}
export interface DigitalTwinState {
    machineId: string;
    machineName: string;
    machineType: string;
    currentPower: number;
    currentTemp: number;
    currentVibration: number;
    currentRuntime: number;
    predictedFailure: {
        probability: number;
        failureType: string;
        daysUntilFailure: number;
        riskLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
    recommendations: string[];
    simulationResults: SimulationResult[];
}
export interface SimulationResult {
    scenario: string;
    duration: number;
    projectedPower: number;
    projectedTemp: number;
    projectedVibration: number;
    failureProbability: number;
    lifespan: number;
    recommendation: string;
}
export interface FailurePredictionModel {
    machineId: string;
    temperature: number;
    vibration: number;
    power: number;
    runtime: number;
}
export declare const digitalTwinService: {
    /**
     * MAIN FEATURE: Simulate production with energy & material cost analysis
     * WITH STRICT INPUT VALIDATION
     */
    simulateProduction(input: ProductionSimulationInput): Promise<EnergyOptimizationResult>;
    /**
     * Calculate machine efficiency (0-1)
     */
    calculateMachineEfficiency(temperature: number, vibration: number): number;
    /**
     * Calculate failure probability (0-1)
     */
    calculateFailureProbability(temperature: number, vibration: number, power: number): number;
    /**
     * Assess quality impact
     */
    assessQualityImpact(wasteRate: number, productionVolume: number): string;
    /**
     * Generate optimization recommendations
     */
    generateProductionRecommendations(machineType: string, temperature: number, vibration: number, wasteRate: number, moneySavings: number, operationHours: number): OptimizationRecommendation[];
    /**
     * Get production baseline
     */
    getProductionBaseline(machineId: string): Promise<any>;
    /**
     * Predict failure
     */
    predictFailure(model: FailurePredictionModel): DigitalTwinState["predictedFailure"];
    /**
     * Generate health recommendations
     */
    generateRecommendations(reading: any, prediction: DigitalTwinState["predictedFailure"]): string[];
    /**
     * Get machine state
     */
    getMachineState(machineId: string): Promise<DigitalTwinState | null>;
    /**
     * Simulate scenario
     */
    simulateScenario(machineId: string, scenario: "NORMAL" | "HEAVY_LOAD" | "OVERHEATED" | "WORN_BEARINGS", duration: number): Promise<SimulationResult>;
    /**
     * Test all scenarios
     */
    testAllScenarios(machineId: string): Promise<SimulationResult[]>;
    /**
     * Calculate RUL
     */
    calculateRUL(currentState: DigitalTwinState): {
        hours: number;
        days: number;
        confidence: number;
    };
};
//# sourceMappingURL=digital-twin.service.d.ts.map