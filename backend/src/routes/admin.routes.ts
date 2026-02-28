import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { prisma } from '../prisma/client';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// User management
router.get('/users', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, factoryId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/users/:id/role', async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role: req.body.role },
            select: { id: true, email: true, name: true, role: true },
        });
        res.json(user);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// System stats
router.get('/stats', async (_req, res) => {
    try {
        const [users, factories, machines, alerts, readings] = await Promise.all([
            prisma.user.count(),
            prisma.factory.count(),
            prisma.machine.count(),
            prisma.alert.count({ where: { resolved: false } }),
            prisma.energyReading.count(),
        ]);
        res.json({ users, factories, machines, activeAlerts: alerts, totalReadings: readings });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
