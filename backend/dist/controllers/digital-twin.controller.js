"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalTwinController = void 0;
const digital_twin_service_1 = require("../services/digital-twin.service");
exports.digitalTwinController = {
    /**
     * Get digital twin state for a specific machine
     */
    async getMachineState(req, res) {
        try {
            const { machineId } = req.params;
            const state = await digital_twin_service_1.digitalTwinService.getMachineState(machineId);
            if (!state) {
                res.status(404).json({ error: 'Machine not found or no data available' });
                return;
            }
            // Get all simulation results
            const simulations = await digital_twin_service_1.digitalTwinService.testAllScenarios(machineId);
            state.simulationResults = simulations;
            // Calculate RUL
            const rul = digital_twin_service_1.digitalTwinService.calculateRUL(state);
            res.json({
                ...state,
                remainingUsefulLife: rul,
            });
        }
        catch (error) {
            console.error('[Digital Twin Controller] Get machine state error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Run a specific scenario simulation
     */
    async simulateScenario(req, res) {
        try {
            const { machineId } = req.params;
            const { scenario, duration } = req.body;
            if (!['NORMAL', 'HEAVY_LOAD', 'OVERHEATED', 'WORN_BEARINGS'].includes(scenario)) {
                res.status(400).json({ error: 'Invalid scenario type' });
                return;
            }
            if (!duration || duration < 1 || duration > 1000) {
                res.status(400).json({ error: 'Duration must be between 1 and 1000 hours' });
                return;
            }
            const result = await digital_twin_service_1.digitalTwinService.simulateScenario(machineId, scenario, duration);
            res.json(result);
        }
        catch (error) {
            console.error('[Digital Twin Controller] Simulate scenario error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Test all scenarios for a machine
     */
    async testAllScenarios(req, res) {
        try {
            const { machineId } = req.params;
            const results = await digital_twin_service_1.digitalTwinService.testAllScenarios(machineId);
            res.json({
                machineId,
                scenarios: results,
                bestCase: results.reduce((min, r) => (r.failureProbability < min.failureProbability ? r : min)),
                worstCase: results.reduce((max, r) => (r.failureProbability > max.failureProbability ? r : max)),
            });
        }
        catch (error) {
            console.error('[Digital Twin Controller] Test all scenarios error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Get RUL for a machine
     */
    async getRUL(req, res) {
        try {
            const { machineId } = req.params;
            const state = await digital_twin_service_1.digitalTwinService.getMachineState(machineId);
            if (!state) {
                res.status(404).json({ error: 'Machine not found' });
                return;
            }
            const rul = digital_twin_service_1.digitalTwinService.calculateRUL(state);
            res.json({
                machineId,
                remainingUsefulLife: rul,
                healthStatus: state.predictedFailure.riskLevel,
                estimatedFailureDate: new Date(Date.now() + rul.days * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
        catch (error) {
            console.error('[Digital Twin Controller] Get RUL error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Predict failure for a machine
     */
    async predictFailure(req, res) {
        try {
            const { machineId } = req.params;
            const state = await digital_twin_service_1.digitalTwinService.getMachineState(machineId);
            if (!state) {
                res.status(404).json({ error: 'Machine not found' });
                return;
            }
            res.json({
                machineId,
                failurePrediction: state.predictedFailure,
                recommendations: state.recommendations,
                currentMetrics: {
                    power: state.currentPower,
                    temperature: state.currentTemp,
                    vibration: state.currentVibration,
                    runtime: state.currentRuntime,
                },
            });
        }
        catch (error) {
            console.error('[Digital Twin Controller] Predict failure error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Get all machines as digital twins
     */
    async getAllMachines(req, res) {
        try {
            const { Prisma } = require('@prisma/client');
            const { prisma } = require('../prisma/client');
            const machines = await prisma.machine.findMany();
            const twins = await Promise.all(machines.map(async (machine) => {
                const state = await digital_twin_service_1.digitalTwinService.getMachineState(machine.id);
                return {
                    id: machine.id,
                    name: machine.name,
                    type: machine.type,
                    state,
                };
            }));
            res.json({
                total: twins.length,
                machines: twins.filter((t) => t.state !== null),
            });
        }
        catch (error) {
            console.error('[Digital Twin Controller] Get all machines error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * NEW: Simulate production with energy & material cost analysis
     * User provides: hours, units to produce, material type & quantity
     * Returns: baseline vs optimized costs + recommendations
     */
    async simulateProduction(req, res) {
        try {
            const { machineId } = req.params;
            const { operationHours, targetProduction, materialType, materialQuantity } = req.body;
            // Validation
            if (!operationHours || operationHours < 1 || operationHours > 8760) {
                res.status(400).json({ error: 'Operation hours must be between 1 and 8760 (1 year)' });
                return;
            }
            if (!targetProduction || targetProduction < 1 || targetProduction > 100000) {
                res.status(400).json({ error: 'Target production must be between 1 and 100,000 units' });
                return;
            }
            if (materialQuantity && materialQuantity < 0) {
                res.status(400).json({ error: 'Material quantity cannot be negative' });
                return;
            }
            const input = {
                machineId,
                operationHours,
                targetProduction,
                materialType: materialType || 'generic',
                materialQuantity: materialQuantity || targetProduction * 0.5,
            };
            const result = await digital_twin_service_1.digitalTwinService.simulateProduction(input);
            res.json(result);
        }
        catch (error) {
            console.error('[Digital Twin Controller] Production simulation error:', error);
            res.status(500).json({ error: error.message });
        }
    },
    /**
     * Get production baseline data for a machine
     */
    async getProductionBaseline(req, res) {
        try {
            const { machineId } = req.params;
            const baseline = await digital_twin_service_1.digitalTwinService.getProductionBaseline(machineId);
            if (!baseline) {
                res.status(404).json({ error: 'No historical data available for this machine' });
                return;
            }
            res.json(baseline);
        }
        catch (error) {
            console.error('[Digital Twin Controller] Get baseline error:', error);
            res.status(500).json({ error: error.message });
        }
    },
};
//# sourceMappingURL=digital-twin.controller.js.map