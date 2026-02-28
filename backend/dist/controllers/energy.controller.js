"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.energyController = void 0;
const energy_service_1 = require("../services/energy.service");
exports.energyController = {
    async ingest(req, res) {
        try {
            const reading = await energy_service_1.energyService.ingest(req.body);
            res.status(201).json(reading);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getHistory(req, res) {
        try {
            const { machineId } = req.params;
            const hours = parseInt(req.query.hours) || 24;
            const data = await energy_service_1.energyService.getHistory(machineId, hours);
            res.json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getDashboardStats(req, res) {
        try {
            const stats = await energy_service_1.energyService.getDashboardStats();
            res.json(stats);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getMonthlyTrend(req, res) {
        try {
            const trend = await energy_service_1.energyService.getMonthlyTrend();
            res.json(trend);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
//# sourceMappingURL=energy.controller.js.map