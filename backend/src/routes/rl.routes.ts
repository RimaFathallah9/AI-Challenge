import { Router } from 'express';
import { rlController } from '../controllers/rl.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

// Get energy optimization analysis
router.get('/analyze', rlController.analyze);

// Get actionable recommendations for cost savings
router.get('/recommendations', rlController.getRecommendations);

// Admin-only: Generate training data for the RL model
router.post('/admin/generate-training-data', requireRole('ADMIN'), rlController.generateTrainingData);

export default router;
