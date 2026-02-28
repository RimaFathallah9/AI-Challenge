import { prisma } from '../prisma/client';
import { AlertSeverity } from '@prisma/client';

export const alertService = {
    async getAll(resolved?: boolean) {
        return prisma.alert.findMany({
            where: resolved !== undefined ? { resolved } : undefined,
            include: { machine: { select: { name: true, type: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    async getById(id: string) {
        return prisma.alert.findUnique({
            where: { id },
            include: { machine: { select: { name: true, type: true, factory: { select: { name: true } } } } },
        });
    },

    async create(data: { machineId: string; message: string; details?: string; severity?: AlertSeverity }) {
        return prisma.alert.create({ data });
    },

    async resolve(id: string) {
        return prisma.alert.update({
            where: { id },
            data: { resolved: true, resolvedAt: new Date() },
        });
    },

    async getStats() {
        const total = await prisma.alert.count();
        const active = await prisma.alert.count({ where: { resolved: false } });
        const bySeverity = await prisma.alert.groupBy({
            by: ['severity'],
            _count: { severity: true },
        });
        return { total, active, bySeverity };
    },
};
