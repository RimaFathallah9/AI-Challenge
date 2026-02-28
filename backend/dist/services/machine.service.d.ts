import { ApprovalStatus, MachineStatus } from '@prisma/client';
export declare const machineService: {
    getAll(factoryId?: string, approvalStatus?: ApprovalStatus): Promise<({
        factory: {
            name: string;
        };
        _count: {
            energyReadings: number;
            alerts: number;
        };
        createdBy: {
            role: import(".prisma/client").$Enums.Role;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    })[]>;
    getById(id: string): Promise<({
        factory: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
        };
        createdBy: {
            email: string;
            name: string | null;
        } | null;
        approvedBy: {
            email: string;
            name: string | null;
        } | null;
        energyReadings: {
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
        }[];
        predictions: {
            id: string;
            type: import(".prisma/client").$Enums.PredictionType;
            generatedAt: Date;
            machineId: string;
            value: number;
            confidence: number | null;
        }[];
        alerts: {
            id: string;
            createdAt: Date;
            resolved: boolean;
            machineId: string;
            message: string;
            details: string | null;
            severity: import(".prisma/client").$Enums.AlertSeverity;
            resolvedAt: Date | null;
        }[];
        recommendations: {
            id: string;
            createdAt: Date;
            machineId: string;
            content: string;
            savings: number | null;
            applied: boolean;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }) | null>;
    create(data: {
        name: string;
        type: string;
        factoryId: string;
        status?: MachineStatus;
        approvalStatus?: ApprovalStatus;
        createdById?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    update(id: string, data: Partial<{
        name: string;
        type: string;
        status: MachineStatus;
    }>): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    setApproval(id: string, approvalStatus: "APPROVED" | "REJECTED", approvedById: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        factoryId: string;
        type: string;
        status: import(".prisma/client").$Enums.MachineStatus;
        approvalStatus: import(".prisma/client").$Enums.ApprovalStatus;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    getAnalytics(id: string): Promise<{
        avgPower: number;
        avgTemp: number;
        peakPower: number;
        totalReadings: number;
        readings: {
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
        }[];
    } | null>;
};
//# sourceMappingURL=machine.service.d.ts.map