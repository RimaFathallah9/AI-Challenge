import express, { Router } from 'express';
import { digitalTwinController } from '../controllers/digital-twin.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = express.Router();

// All digital twin routes require authentication
router.use(authenticate);

/**
 * Get complete digital twin state for a machine
 * Includes current metrics, failure predictions, and all scenario simulations
 * GET /api/digital-twin/machines/:machineId
 */
router.get('/machines/:machineId', digitalTwinController.getMachineState);

/**
 * Get all machines with their digital twin states
 * GET /api/digital-twin/machines
 */
router.get('/machines', digitalTwinController.getAllMachines);

/**
 * Simulate a specific scenario for a machine
 * POST /api/digital-twin/machines/:machineId/simulate
 * Body: { scenario: 'NORMAL' | 'HEAVY_LOAD' | 'OVERHEATED' | 'WORN_BEARINGS', duration: number }
 */
router.post('/machines/:machineId/simulate', digitalTwinController.simulateScenario);

/**
 * Test all scenarios for a machine
 * GET /api/digital-twin/machines/:machineId/test-scenarios
 */
router.get('/machines/:machineId/test-scenarios', digitalTwinController.testAllScenarios);

/**
 * Get remaining useful life prediction for a machine
 * GET /api/digital-twin/machines/:machineId/rul
 */
router.get('/machines/:machineId/rul', digitalTwinController.getRUL);

/**
 * Get failure prediction and recommendations for a machine
 * GET /api/digital-twin/machines/:machineId/predict-failure
 */
router.get('/machines/:machineId/predict-failure', digitalTwinController.predictFailure);

/**
 * Get production baseline data for a machine
 * GET /api/digital-twin/machines/:machineId/production-baseline
 */
router.get('/machines/:machineId/production-baseline', digitalTwinController.getProductionBaseline);

/**
 * Simulate production with energy & material cost analysis
 * User provides: operation hours, units to produce, material type & quantity
 * Returns: baseline vs optimized metrics with energy/material savings & recommendations
 * POST /api/digital-twin/machines/:machineId/simulate-production
 * Body: { operationHours: number, targetProduction: number, materialType?: string, materialQuantity?: number }
 */
router.post('/machines/:machineId/simulate-production', digitalTwinController.simulateProduction);

export default router;
