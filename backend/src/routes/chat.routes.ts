import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/ai/chat
router.post('/chat', authenticate, chatController.interact);

export default router;
