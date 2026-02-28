"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("../prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', async (_req, res) => {
    try {
        const factories = await client_1.prisma.factory.findMany({ include: { _count: { select: { machines: true, users: true } } } });
        res.json(factories);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const factory = await client_1.prisma.factory.findUnique({
            where: { id: req.params.id },
            include: { machines: true, users: { select: { id: true, name: true, email: true, role: true } } },
        });
        if (!factory)
            return res.status(404).json({ error: 'Factory not found' });
        res.json(factory);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', (0, role_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { name, location } = req.body;
        const factory = await client_1.prisma.factory.create({ data: { name, location } });
        res.status(201).json(factory);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', (0, role_middleware_1.requireRole)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const factory = await client_1.prisma.factory.update({ where: { id: req.params.id }, data: req.body });
        res.json(factory);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', (0, role_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        await client_1.prisma.factory.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=factory.routes.js.map