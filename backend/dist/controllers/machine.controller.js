"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machineController = void 0;
const machine_service_1 = require("../services/machine.service");
exports.machineController = {
    async getAll(req, res) {
        try {
            const factoryId = req.query.factoryId;
            const userRole = req.user?.role;
            // Admins/Managers see all machines; Technicians only see approved ones
            const approvalFilter = (userRole === 'ADMIN' || userRole === 'MANAGER')
                ? undefined
                : 'APPROVED';
            const machines = await machine_service_1.machineService.getAll(factoryId, approvalFilter);
            res.json(machines);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getById(req, res) {
        try {
            const machine = await machine_service_1.machineService.getById(req.params.id);
            if (!machine)
                return res.status(404).json({ error: 'Machine not found' });
            res.json(machine);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async create(req, res) {
        try {
            const { name, type, factoryId, status } = req.body;
            if (!name || !type || !factoryId) {
                return res.status(400).json({ error: 'name, type, factoryId are required' });
            }
            const userRole = req.user?.role;
            const userId = req.user?.userId;
            // Technicians get PENDING; Admins/Managers are immediately APPROVED
            const approvalStatus = userRole === 'TECHNICIAN' ? 'PENDING' : 'APPROVED';
            const machine = await machine_service_1.machineService.create({
                name, type, factoryId, status,
                approvalStatus,
                createdById: userId,
            });
            res.status(201).json(machine);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async update(req, res) {
        try {
            const machine = await machine_service_1.machineService.update(req.params.id, req.body);
            res.json(machine);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async delete(req, res) {
        try {
            await machine_service_1.machineService.delete(req.params.id);
            res.status(204).send();
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getAnalytics(req, res) {
        try {
            const analytics = await machine_service_1.machineService.getAnalytics(req.params.id);
            if (!analytics)
                return res.status(404).json({ error: 'No data found' });
            res.json(analytics);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    /**
     * Admin-only: approve or reject a pending machine
     * PATCH /api/machines/:id/approve
     * body: { action: 'APPROVED' | 'REJECTED' }
     */
    async approve(req, res) {
        try {
            const { action } = req.body;
            if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
                return res.status(400).json({ error: 'action must be APPROVED or REJECTED' });
            }
            const adminId = req.user?.userId;
            const machine = await machine_service_1.machineService.setApproval(req.params.id, action, adminId);
            res.json(machine);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
//# sourceMappingURL=machine.controller.js.map