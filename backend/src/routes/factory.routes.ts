import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { prisma } from '../prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
    try {
        const factories = await prisma.factory.findMany({ include: { _count: { select: { machines: true, users: true } } } });
        res.json(factories);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const factory = await prisma.factory.findUnique({
            where: { id: req.params.id },
            include: { machines: true, users: { select: { id: true, name: true, email: true, role: true } } },
        });
        if (!factory) return res.status(404).json({ error: 'Factory not found' });
        res.json(factory);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
    try {
        const { name, location } = req.body;
        const factory = await prisma.factory.create({ data: { name, location } });
        res.status(201).json(factory);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const factory = await prisma.factory.update({ where: { id: req.params.id }, data: req.body });
        res.json(factory);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        await prisma.factory.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
