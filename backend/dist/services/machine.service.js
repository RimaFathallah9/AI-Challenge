"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machineService = void 0;
const client_1 = require("../prisma/client");
exports.machineService = {
    async getAll(factoryId, approvalStatus) {
        const where = {};
        if (factoryId)
            where.factoryId = factoryId;
        if (approvalStatus)
            where.approvalStatus = approvalStatus;
        return client_1.prisma.machine.findMany({
            where,
            include: {
                factory: { select: { name: true } },
                createdBy: { select: { name: true, email: true, role: true } },
                _count: { select: { energyReadings: true, alerts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    async getById(id) {
        return client_1.prisma.machine.findUnique({
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
    async create(data) {
        return client_1.prisma.machine.create({ data });
    },
    async update(id, data) {
        return client_1.prisma.machine.update({ where: { id }, data });
    },
    async delete(id) {
        return client_1.prisma.machine.delete({ where: { id } });
    },
    async setApproval(id, approvalStatus, approvedById) {
        return client_1.prisma.machine.update({
            where: { id },
            data: {
                approvalStatus,
                approvedById,
                approvedAt: new Date(),
            },
        });
    },
    async getAnalytics(id) {
        const readings = await client_1.prisma.energyReading.findMany({
            where: { machineId: id },
            orderBy: { timestamp: 'asc' },
            take: 500,
        });
        if (!readings.length)
            return null;
        const totalPower = readings.reduce((s, r) => s + r.power, 0);
        const avgPower = totalPower / readings.length;
        const avgTemp = readings.reduce((s, r) => s + r.temperature, 0) / readings.length;
        const peakPower = Math.max(...readings.map((r) => r.power));
        return { avgPower, avgTemp, peakPower, totalReadings: readings.length, readings };
    },
};
//# sourceMappingURL=machine.service.js.map