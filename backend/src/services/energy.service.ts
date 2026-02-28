import { prisma } from '../prisma/client';

export const energyService = {
    async ingest(data: { machineId: string; voltage: number; current: number; power: number; temperature: number; runtime: number }) {
        return prisma.energyReading.create({ data });
    },

    async getHistory(machineId: string, hours = 24) {
        const since = new Date(Date.now() - hours * 3600 * 1000);
        return prisma.energyReading.findMany({
            where: { machineId, timestamp: { gte: since } },
            orderBy: { timestamp: 'asc' },
        });
    },

    async getDashboardStats() {
        const today = new Date(); today.setHours(0, 0, 0, 0);

        // Total power consumption today
        const todayReadings = await prisma.energyReading.findMany({
            where: { timestamp: { gte: today } },
            select: { power: true },
        });
        const totalToday = todayReadings.reduce((s, r) => s + r.power, 0);

        // Count machines
        const machineCount = await prisma.machine.count();
        const onlineCount = await prisma.machine.count({ where: { status: 'ONLINE' } });

        // Active alerts
        const activeAlerts = await prisma.alert.count({ where: { resolved: false } });

        // Monthly trend (last 12 months aggregated by day approximation)
        const monthlyReadings = await prisma.energyReading.findMany({
            where: { timestamp: { gte: new Date(Date.now() - 365 * 86400000) } },
            select: { power: true, timestamp: true },
            orderBy: { timestamp: 'asc' },
        });

        return {
            totalToday: Math.round(totalToday),
            machineCount,
            onlineCount,
            activeAlerts,
            co2Estimate: Math.round(totalToday * 0.233), // kg CO2 per kWh average
            efficiencyScore: Math.min(100, Math.round((onlineCount / Math.max(1, machineCount)) * 100)),
            monthlyReadings,
        };
    },

    async getMonthlyTrend() {
        // Returns per-month aggregated energy for chart
        const readings = await prisma.energyReading.findMany({
            select: { power: true, timestamp: true },
            orderBy: { timestamp: 'asc' },
        });

        const monthly: Record<string, number> = {};
        readings.forEach(r => {
            const key = `${r.timestamp.getFullYear()}-${String(r.timestamp.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = (monthly[key] || 0) + r.power;
        });
        return monthly;
    },
};
