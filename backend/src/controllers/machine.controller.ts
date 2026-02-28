import { Request, Response } from 'express';
import { machineService } from '../services/machine.service';
import { ApprovalStatus } from '@prisma/client';

export const machineController = {
    async getAll(req: Request, res: Response) {
        try {
            const factoryId = req.query.factoryId as string | undefined;
            const userRole = req.user?.role;
            // Admins/Managers see all machines; Technicians only see approved ones
            const approvalFilter = (userRole === 'ADMIN' || userRole === 'MANAGER')
                ? undefined
                : 'APPROVED' as ApprovalStatus;
            const machines = await machineService.getAll(factoryId, approvalFilter);
            res.json(machines);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getById(req: Request, res: Response) {
        try {
            const machine = await machineService.getById(req.params.id);
            if (!machine) return res.status(404).json({ error: 'Machine not found' });
            res.json(machine);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async create(req: Request, res: Response) {
        try {
            const { name, type, factoryId, status } = req.body;
            if (!name || !type || !factoryId) {
                return res.status(400).json({ error: 'name, type, factoryId are required' });
            }
            const userRole = req.user?.role;
            const userId = req.user?.userId;

            // Technicians get PENDING; Admins/Managers are immediately APPROVED
            const approvalStatus: ApprovalStatus =
                userRole === 'TECHNICIAN' ? 'PENDING' : 'APPROVED';

            const machine = await machineService.create({
                name, type, factoryId, status,
                approvalStatus,
                createdById: userId,
            });
            res.status(201).json(machine);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async update(req: Request, res: Response) {
        try {
            const machine = await machineService.update(req.params.id, req.body);
            res.json(machine);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async delete(req: Request, res: Response) {
        try {
            await machineService.delete(req.params.id);
            res.status(204).send();
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    async getAnalytics(req: Request, res: Response) {
        try {
            const analytics = await machineService.getAnalytics(req.params.id);
            if (!analytics) return res.status(404).json({ error: 'No data found' });
            res.json(analytics);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },

    /**
     * Admin-only: approve or reject a pending machine
     * PATCH /api/machines/:id/approve
     * body: { action: 'APPROVED' | 'REJECTED' }
     */
    async approve(req: Request, res: Response) {
        try {
            const { action } = req.body as { action: 'APPROVED' | 'REJECTED' };
            if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
                return res.status(400).json({ error: 'action must be APPROVED or REJECTED' });
            }
            const adminId = req.user?.userId;
            const machine = await machineService.setApproval(req.params.id, action, adminId!);
            res.json(machine);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    },
};
