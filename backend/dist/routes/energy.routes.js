"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const energy_controller_1 = require("../controllers/energy.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const sensor_service_1 = require("../services/sensor.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/dashboard', energy_controller_1.energyController.getDashboardStats);
router.get('/trend', energy_controller_1.energyController.getMonthlyTrend);
router.get('/:machineId', energy_controller_1.energyController.getHistory);
router.post('/ingest', energy_controller_1.energyController.ingest);
// Admin-only: Generate historical data for AI training
router.post('/admin/generate-historical-data', (0, role_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        console.log('🎯 Admin requested historical data generation');
        await sensor_service_1.sensorService.generateHistoricalData();
        res.json({
            success: true,
            message: '✅ Historical data generation started. This may take a few minutes.'
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to generate historical data',
            detail: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=energy.routes.js.map