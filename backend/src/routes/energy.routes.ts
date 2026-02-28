import { Router } from 'express';
import { energyController } from '../controllers/energy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { sensorService } from '../services/sensor.service';

const router = Router();
router.use(authenticate);

router.get('/dashboard', energyController.getDashboardStats);
router.get('/trend', energyController.getMonthlyTrend);
router.get('/:machineId', energyController.getHistory);
router.post('/ingest', energyController.ingest);

// Admin-only: Generate historical data for AI training
router.post('/admin/generate-historical-data', requireRole('ADMIN'), async (req, res) => {
    try {
        console.log('🎯 Admin requested historical data generation');
        await sensorService.generateHistoricalData();
        res.json({ 
            success: true, 
            message: '✅ Historical data generation started. This may take a few minutes.'
        });
    } catch (error: any) {
        res.status(500).json({ 
            error: 'Failed to generate historical data', 
            detail: error.message 
        });
    }
});

export default router;
