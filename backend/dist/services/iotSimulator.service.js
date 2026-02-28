"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIoTSimulation = startIoTSimulation;
exports.stopIoTSimulation = stopIoTSimulation;
const client_1 = require("../prisma/client");
const gemini_service_1 = require("./gemini.service");
// Realistic base values per machine "type"
const MACHINE_PROFILES = {
    'Hydraulic Press': { voltage: 400, current: 85, power: 34, temp: 72, vibration: 2.5, productionBase: 120 },
    'CNC Machine': { voltage: 220, current: 45, power: 9.9, temp: 45, vibration: 1.2, productionBase: 45 },
    'Conveyor Belt': { voltage: 380, current: 30, power: 11.4, temp: 38, vibration: 0.8, productionBase: 300 },
    'Air Compressor': { voltage: 400, current: 60, power: 24, temp: 65, vibration: 3.1, productionBase: 0 },
    'Welding Robot': { voltage: 300, current: 120, power: 36, temp: 80, vibration: 1.5, productionBase: 80 },
};
// Store stateful anomaly tracking per machine
const machineAnomalyStates = {};
let simulationInterval = null;
/**
 * Add Gaussian noise to a value (±percent%)
 */
function addNoise(value, percent = 0.05) {
    const noise = (Math.random() - 0.5) * 2 * percent * value;
    return Math.round((value + noise) * 100) / 100;
}
/**
 * Occasionally inject a spike (anomaly) for demo purposes
 */
function maybeSpikeAnomaly(value, chance = 0.03) {
    if (Math.random() < chance) {
        return value * (1.4 + Math.random() * 0.6); // 40-100% spike
    }
    return value;
}
/**
 * Start IoT simulation loop — creates readings every 2 seconds and broadcasts
 */
function startIoTSimulation(broadcast) {
    if (simulationInterval)
        clearInterval(simulationInterval);
    simulationInterval = setInterval(async () => {
        try {
            const machines = await client_1.prisma.machine.findMany({
                where: { status: { not: 'OFFLINE' } },
                select: { id: true, name: true, type: true, status: true },
            });
            if (!machines.length)
                return;
            const readings = machines.map((machine) => {
                if (!machineAnomalyStates[machine.id]) {
                    machineAnomalyStates[machine.id] = { heatTrendingUp: 0, vibrationTrendingUp: 0 };
                }
                const state = machineAnomalyStates[machine.id];
                const profile = MACHINE_PROFILES[machine.type] || MACHINE_PROFILES['CNC Machine'];
                // Complex anomaly injections based on random chance
                let tempMultiplier = 1;
                let vibrationMultiplier = 1;
                let powerMultiplier = 1;
                // 2% chance to start overheating, stays hot until AI handles it
                if (Math.random() < 0.02 || state.heatTrendingUp > 0) {
                    if (state.heatTrendingUp < 50)
                        state.heatTrendingUp++; // Cap at severe overheating
                    tempMultiplier = 1 + (state.heatTrendingUp * 0.05); // 5% hotter per tick
                }
                // 1% chance for power spike
                if (Math.random() < 0.01) {
                    powerMultiplier = 1.6 + Math.random(); // 160% to 260% spike
                }
                // 2% chance to start creeping predictive failure (vibration)
                if (Math.random() < 0.02 || state.vibrationTrendingUp > 0) {
                    if (state.vibrationTrendingUp < 100)
                        state.vibrationTrendingUp++;
                    vibrationMultiplier = 1 + (state.vibrationTrendingUp * 0.02); // 2% rougher per tick
                }
                // Calculate final metrics
                const voltage = addNoise(profile.voltage);
                const current = addNoise(profile.current);
                const power = addNoise(profile.power) * powerMultiplier;
                const temperature = addNoise(profile.temp) * tempMultiplier;
                const vibration = addNoise(profile.vibration) * vibrationMultiplier;
                // Production drops if overheating or vibrating heavily
                const efficiency = Math.max(0.1, 1 - (tempMultiplier - 1) - (vibrationMultiplier - 1));
                const production = profile.productionBase > 0 ? addNoise(profile.productionBase) * efficiency : 0;
                const runtime = parseFloat((Math.random() * 8 + 1).toFixed(2));
                return {
                    machineId: machine.id,
                    machineName: machine.name,
                    machineType: machine.type,
                    status: machine.status,
                    voltage,
                    current,
                    power,
                    temperature,
                    vibration,
                    production,
                    runtime,
                    timestamp: new Date().toISOString(),
                };
            });
            // Persist to DB (batch insert)
            await client_1.prisma.energyReading.createMany({
                data: readings.map(({ machineName, machineType, status, timestamp, ...r }) => ({
                    ...r,
                    timestamp: new Date(timestamp),
                })),
            });
            // Auto-create alerts for anomalies and trigger AI logic hooks
            // (The AI Core will intercept these in gemini.service.ts eventually. 
            // For now we persist standard alerts as warnings that Gemini should evaluate)
            for (const r of readings) {
                const profile = MACHINE_PROFILES[r.machineType] || MACHINE_PROFILES['CNC Machine'];
                let anomalyType = null;
                if (r.power > profile.power * 1.5) {
                    anomalyType = 'POWER_SPIKE';
                }
                else if (r.temperature > profile.temp * 1.3) {
                    anomalyType = 'OVERHEATING';
                }
                else if (r.vibration && r.vibration > profile.vibration * 1.5) {
                    anomalyType = 'PREDICTIVE_FAILURE_VIBRATION';
                }
                if (anomalyType) {
                    // Trigger the autonomous AI agent
                    // We don't await this because we want the simulation to keep running fast
                    gemini_service_1.geminiService.evaluateAnomaly(r.machineId, r.machineName, r.machineType, anomalyType, r);
                }
            }
            // Broadcast to all WebSocket clients
            broadcast({ type: 'iot_data', readings, timestamp: new Date().toISOString() });
        }
        catch (err) {
            // Silently skip — DB might not be connected in dev
            console.error('[IoT Sim] Error:', err);
        }
    }, 2000);
    console.log('🤖 IoT simulation started — broadcasting every 2s');
}
function stopIoTSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}
//# sourceMappingURL=iotSimulator.service.js.map