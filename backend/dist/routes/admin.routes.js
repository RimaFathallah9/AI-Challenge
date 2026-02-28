"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("../prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)('ADMIN'));
// User management
router.get('/users', async (_req, res) => {
    try {
        const users = await client_1.prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, factoryId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/users/:id/role', async (req, res) => {
    try {
        const user = await client_1.prisma.user.update({
            where: { id: req.params.id },
            data: { role: req.body.role },
            select: { id: true, email: true, name: true, role: true },
        });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/users/:id', async (req, res) => {
    try {
        await client_1.prisma.user.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// System stats
router.get('/stats', async (_req, res) => {
    try {
        const [users, factories, machines, alerts, readings] = await Promise.all([
            client_1.prisma.user.count(),
            client_1.prisma.factory.count(),
            client_1.prisma.machine.count(),
            client_1.prisma.alert.count({ where: { resolved: false } }),
            client_1.prisma.energyReading.count(),
        ]);
        res.json({ users, factories, machines, activeAlerts: alerts, totalReadings: readings });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map