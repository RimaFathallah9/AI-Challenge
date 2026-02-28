import { AlertSeverity } from '@prisma/client';
export declare const alertService: {
    getAll(resolved?: boolean): Promise<({
        machine: {
            name: string;
            type: string;
        };
    } & {
        id: string;
        createdAt: Date;
        resolved: boolean;
        machineId: string;
        message: string;
        details: string | null;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        resolvedAt: Date | null;
    })[]>;
    getById(id: string): Promise<({
        machine: {
            factory: {
                name: string;
            };
            name: string;
            type: string;
        };
    } & {
        id: string;
        createdAt: Date;
        resolved: boolean;
        machineId: string;
        message: string;
        details: string | null;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        resolvedAt: Date | null;
    }) | null>;
    create(data: {
        machineId: string;
        message: string;
        details?: string;
        severity?: AlertSeverity;
    }): Promise<{
        id: string;
        createdAt: Date;
        resolved: boolean;
        machineId: string;
        message: string;
        details: string | null;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        resolvedAt: Date | null;
    }>;
    resolve(id: string): Promise<{
        id: string;
        createdAt: Date;
        resolved: boolean;
        machineId: string;
        message: string;
        details: string | null;
        severity: import(".prisma/client").$Enums.AlertSeverity;
        resolvedAt: Date | null;
    }>;
    getStats(): Promise<{
        total: number;
        active: number;
        bySeverity: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AlertGroupByOutputType, "severity"[]> & {
            _count: {
                severity: number;
            };
        })[];
    }>;
};
//# sourceMappingURL=alert.service.d.ts.map