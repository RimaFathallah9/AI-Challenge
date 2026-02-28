"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = void 0;
const client_1 = require("../prisma/client");
exports.alertService = {
    async getAll(resolved) {
        return client_1.prisma.alert.findMany({
            where: resolved !== undefined ? { resolved } : undefined,
            include: { machine: { select: { name: true, type: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },
    async getById(id) {
        return client_1.prisma.alert.findUnique({
            where: { id },
            include: { machine: { select: { name: true, type: true, factory: { select: { name: true } } } } },
        });
    },
    async create(data) {
        return client_1.prisma.alert.create({ data });
    },
    async resolve(id) {
        return client_1.prisma.alert.update({
            where: { id },
            data: { resolved: true, resolvedAt: new Date() },
        });
    },
    async getStats() {
        const total = await client_1.prisma.alert.count();
        const active = await client_1.prisma.alert.count({ where: { resolved: false } });
        const bySeverity = await client_1.prisma.alert.groupBy({
            by: ['severity'],
            _count: { severity: true },
        });
        return { total, active, bySeverity };
    },
};
//# sourceMappingURL=alert.service.js.map