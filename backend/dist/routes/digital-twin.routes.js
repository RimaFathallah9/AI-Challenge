"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const digital_twin_controller_1 = require("../controllers/digital-twin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// All digital twin routes require authentication
router.use(auth_middleware_1.authenticate);
/**
 * Get complete digital twin state for a machine
 * Includes current metrics, failure predictions, and all scenario simulations
 * GET /api/digital-twin/machines/:machineId
 */
router.get('/machines/:machineId', digital_twin_controller_1.digitalTwinController.getMachineState);
/**
 * Get all machines with their digital twin states
 * GET /api/digital-twin/machines
 */
router.get('/machines', digital_twin_controller_1.digitalTwinController.getAllMachines);
/**
 * Simulate a specific scenario for a machine
 * POST /api/digital-twin/machines/:machineId/simulate
 * Body: { scenario: 'NORMAL' | 'HEAVY_LOAD' | 'OVERHEATED' | 'WORN_BEARINGS', duration: number }
 */
router.post('/machines/:machineId/simulate', digital_twin_controller_1.digitalTwinController.simulateScenario);
/**
 * Test all scenarios for a machine
 * GET /api/digital-twin/machines/:machineId/test-scenarios
 */
router.get('/machines/:machineId/test-scenarios', digital_twin_controller_1.digitalTwinController.testAllScenarios);
/**
 * Get remaining useful life prediction for a machine
 * GET /api/digital-twin/machines/:machineId/rul
 */
router.get('/machines/:machineId/rul', digital_twin_controller_1.digitalTwinController.getRUL);
/**
 * Get failure prediction and recommendations for a machine
 * GET /api/digital-twin/machines/:machineId/predict-failure
 */
router.get('/machines/:machineId/predict-failure', digital_twin_controller_1.digitalTwinController.predictFailure);
/**
 * Get production baseline data for a machine
 * GET /api/digital-twin/machines/:machineId/production-baseline
 */
router.get('/machines/:machineId/production-baseline', digital_twin_controller_1.digitalTwinController.getProductionBaseline);
/**
 * Simulate production with energy & material cost analysis
 * User provides: operation hours, units to produce, material type & quantity
 * Returns: baseline vs optimized metrics with energy/material savings & recommendations
 * POST /api/digital-twin/machines/:machineId/simulate-production
 * Body: { operationHours: number, targetProduction: number, materialType?: string, materialQuantity?: number }
 */
router.post('/machines/:machineId/simulate-production', digital_twin_controller_1.digitalTwinController.simulateProduction);
exports.default = router;
//# sourceMappingURL=digital-twin.routes.js.map