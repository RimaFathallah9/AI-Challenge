// Shared TypeScript types for NEXOVA frontend

export type Role = 'ADMIN' | 'MANAGER' | 'TECHNICIAN';
export type MachineStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'WARNING' | 'CRITICAL';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PredictionType = 'FORECAST_24H' | 'FORECAST_7D';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: Role;
    factoryId?: string;
    createdAt: string;
}

export interface Factory {
    id: string;
    name: string;
    location?: string;
    createdAt: string;
}

export interface Machine {
    id: string;
    name: string;
    type: string;
    status: MachineStatus;
    factoryId: string;
    factory?: { name: string };
    _count?: { energyReadings: number; alerts: number };
    createdAt: string;
}

export interface EnergyReading {
    id: string;
    machineId: string;
    voltage: number;
    current: number;
    power: number;
    temperature: number;
    runtime: number;
    timestamp: string;
}

export interface Alert {
    id: string;
    machineId: string;
    machine?: { name: string; type: string };
    message: string;
    details?: string;
    severity: AlertSeverity;
    resolved: boolean;
    resolvedAt?: string;
    createdAt: string;
}

export interface Prediction {
    id: string;
    machineId: string;
    type: PredictionType;
    value: number;
    confidence?: number;
    generatedAt: string;
}

export interface Recommendation {
    id: string;
    machineId: string;
    content: string;
    savings?: number;
    applied: boolean;
    createdAt: string;
}

export interface DashboardStats {
    totalToday: number;
    machineCount: number;
    onlineCount: number;
    activeAlerts: number;
    co2Estimate: number;
    efficiencyScore: number;
}

export interface IoTReading {
    machineId: string;
    machineName: string;
    machineType: string;
    status: MachineStatus;
    machineStatus?: MachineStatus; // alias from sensor service
    voltage: number;
    current: number;
    power: number;
    powerUsage?: number; // alias from sensor service
    temperature: number;
    vibration?: number;
    runtime: number;
    timestamp: string;
}

export interface WsMessage {
    type: 'connected' | 'iot_data' | 'sensor_update';
    readings?: IoTReading[];
    data?: IoTReading[];
    timestamp?: string;
    message?: string;
}
