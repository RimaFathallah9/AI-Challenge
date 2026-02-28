import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', alertController.getAll);
router.get('/stats', alertController.getStats);
router.get('/:id', alertController.getById);
router.post('/', alertController.create);
router.patch('/:id/resolve', alertController.resolve);

export default router;
