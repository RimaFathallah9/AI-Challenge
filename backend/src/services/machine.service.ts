import { prisma } from '../prisma/client';
import { ApprovalStatus, MachineStatus } from '@prisma/client';

export const machineService = {
    async getAll(factoryId?: string, approvalStatus?: ApprovalStatus) {
        const where: any = {};
        if (factoryId) where.factoryId = factoryId;
        if (approvalStatus) where.approvalStatus = approvalStatus;

        return prisma.machine.findMany({
            where,
            include: {
                factory: { select: { name: true } },
                createdBy: { select: { name: true, email: true, role: true } },
                _count: { select: { energyReadings: true, alerts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    async getById(id: string) {
        return prisma.machine.findUnique({
            where: { id },
            include: {
                factory: true,
                createdBy: { select: { name: true, email: true } },
                approvedBy: { select: { name: true, email: true } },
                energyReadings: { orderBy: { timestamp: 'desc' }, take: 100 },
                alerts: { where: { resolved: false }, orderBy: { createdAt: 'desc' } },
                recommendations: { orderBy: { createdAt: 'desc' }, take: 5 },
                predictions: { orderBy: { generatedAt: 'desc' }, take: 5 },
            },
        });
    },

    async create(data: {
        name: string;
        type: string;
        factoryId: string;
        status?: MachineStatus;
        approvalStatus?: ApprovalStatus;
        createdById?: string;
    }) {
        return prisma.machine.create({ data });
    },

    async update(id: string, data: Partial<{ name: string; type: string; status: MachineStatus }>) {
        return prisma.machine.update({ where: { id }, data });
    },

    async delete(id: string) {
        return prisma.machine.delete({ where: { id } });
    },

    async setApproval(id: string, approvalStatus: 'APPROVED' | 'REJECTED', approvedById: string) {
        return prisma.machine.update({
            where: { id },
            data: {
                approvalStatus,
                approvedById,
                approvedAt: new Date(),
            },
        });
    },

    async getAnalytics(id: string) {
        const readings = await prisma.energyReading.findMany({
            where: { machineId: id },
            orderBy: { timestamp: 'asc' },
            take: 500,
        });
        if (!readings.length) return null;

        const totalPower = readings.reduce((s, r) => s + r.power, 0);
        const avgPower = totalPower / readings.length;
        const avgTemp = readings.reduce((s, r) => s + r.temperature, 0) / readings.length;
        const peakPower = Math.max(...readings.map((r) => r.power));

        return { avgPower, avgTemp, peakPower, totalReadings: readings.length, readings };
    },
};
