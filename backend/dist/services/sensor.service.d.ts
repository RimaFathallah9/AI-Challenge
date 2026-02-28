export declare const sensorService: {
    setBroadcast(fn: (data: any) => void): void;
    /**
     * Generate ~1000 historical readings (represents ~33 minutes of data at 2s intervals)
     * This creates realistic data close to baseline values for AI model training
     */
    generateHistoricalData(): Promise<void>;
    tick(): Promise<void>;
    start(): void;
    stop(): void;
};
//# sourceMappingURL=sensor.service.d.ts.map