export interface AIAutonomousDecision {
    rootCause: string;
    riskLevel: 'INFO' | 'WARNING' | 'CRITICAL';
    actionTaken: 'MAINTENANCE' | 'OFFLINE' | 'NONE';
    reasoning: string;
    estimatedSavings: number;
    preventedLoss: number;
    humanRecommendation: string;
}
export declare const geminiService: {
    /**
     * The Core AI Brain. Evaluates machine reading anomalies and makes autonomous decisions.
     */
    evaluateAnomaly(machineId: string, machineName: string, machineType: string, anomalyType: string, currentReading: any): Promise<void>;
    /**
     * Dedicated Chat API for the Frontend Assistant Widget
     */
    chat(message: string, context?: any): Promise<string>;
    /**
     * Generates a helpful fallback response when Gemini API is unavailable
     */
    generateFallbackResponse(message: string, context?: any): string;
};
//# sourceMappingURL=gemini.service.d.ts.map