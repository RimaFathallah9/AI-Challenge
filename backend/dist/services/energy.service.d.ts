export declare const energyService: {
    ingest(data: {
        machineId: string;
        voltage: number;
        current: number;
        power: number;
        temperature: number;
        runtime: number;
    }): Promise<{
        production: number;
        id: string;
        timestamp: Date;
        machineId: string;
        voltage: number;
        current: number;
        power: number;
        temperature: number;
        vibration: number;
        runtime: number;
    }>;
    getHistory(machineId: string, hours?: number): Promise<{
        production: number;
        id: string;
        timestamp: Date;
        machineId: string;
        voltage: number;
        current: number;
        power: number;
        temperature: number;
        vibration: number;
        runtime: number;
    }[]>;
    getDashboardStats(): Promise<{
        totalToday: number;
        machineCount: number;
        onlineCount: number;
        activeAlerts: number;
        co2Estimate: number;
        efficiencyScore: number;
        monthlyReadings: {
            timestamp: Date;
            power: number;
        }[];
    }>;
    getMonthlyTrend(): Promise<Record<string, number>>;
};
//# sourceMappingURL=energy.service.d.ts.map