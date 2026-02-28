import { Router } from 'express';
import { machineController } from '../controllers/machine.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

router.get('/', machineController.getAll);
router.get('/:id', machineController.getById);
router.get('/:id/analytics', machineController.getAnalytics);

// ALL authenticated roles can create — but Technicians land as PENDING
router.post('/', machineController.create);

// Only Admin/Manager can edit or delete
router.put('/:id', requireRole('ADMIN', 'MANAGER'), machineController.update);
router.delete('/:id', requireRole('ADMIN'), machineController.delete);

// Admin-only: approve or reject a pending machine
router.patch('/:id/approve', requireRole('ADMIN'), machineController.approve);

export default router;
