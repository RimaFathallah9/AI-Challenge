import { create } from 'zustand';
import { Alert, DashboardStats, IoTReading, Machine } from '../types';

interface DashboardState {
    stats: DashboardStats | null;
    machines: Machine[];
    alerts: Alert[];
    liveReadings: IoTReading[];
    monthlyTrend: Record<string, number>;
    isLoading: boolean;
    setStats: (stats: DashboardStats) => void;
    setMachines: (machines: Machine[]) => void;
    setAlerts: (alerts: Alert[]) => void;
    updateLiveReadings: (readings: IoTReading[]) => void;
    setMonthlyTrend: (trend: Record<string, number>) => void;
    setLoading: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    stats: null,
    machines: [],
    alerts: [],
    liveReadings: [],
    monthlyTrend: {},
    isLoading: false,
    setStats: (stats) => set({ stats }),
    setMachines: (machines) => set({ machines }),
    setAlerts: (alerts) => set({ alerts }),
    updateLiveReadings: (readings) => set({ liveReadings: readings }),
    setMonthlyTrend: (monthlyTrend) => set({ monthlyTrend }),
    setLoading: (isLoading) => set({ isLoading }),
}));
