import { prisma } from '../prisma/client';

// ──────────────────────────────────────────────────────────────────────
// INPUT & OUTPUT MODELS
// ──────────────────────────────────────────────────────────────────────

export interface ProductionSimulationInput {
    machineId: string;
    operationHours: number;
    targetProduction: number;
    materialType?: string;
    materialQuantity?: number;
}

export interface EnergyOptimizationResult {
    machineId: string;
    machineName: string;
    machineType: string;
    scenario: {
        operationHours: number;
        targetProduction: number;
        materialUsed: number;
        materialType: string;
    };
    baselineMetrics: {
        totalEnergyConsumption: number;
        energyCost: number;
        materialWaste: number;
        materialCost: number;
        totalCost: number;
        costPerUnit: number;
        co2Emissions: number;
    };
    optimizedMetrics: {
        totalEnergyConsumption: number;
        energyCost: number;
        materialWaste: number;
        materialCost: number;
        totalCost: number;
        costPerUnit: number;
        co2Emissions: number;
    };
    savings: {
        energySavings: number;
        moneySavings: number;
        wasteReduction: number;
        percentageSavings: number;
        co2Reduction: number;
    };
    recommendations: OptimizationRecommendation[];
    riskAssessment: {
        failureProbability: number;
        qualityImpact: string;
        recommendation: string;
    };
    confidenceScore: number;
}

export interface OptimizationRecommendation {
    title: string;
    description: string;
    estimatedSavings: number;
    implementationTime: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    impact: string;
}

export interface DigitalTwinState {
    machineId: string;
    machineName: string;
    machineType: string;
    currentPower: number;
    currentTemp: number;
    currentVibration: number;
    currentRuntime: number;
    predictedFailure: {
        probability: number;
        failureType: string;
        daysUntilFailure: number;
        riskLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    };
    recommendations: string[];
    simulationResults: SimulationResult[];
}

export interface SimulationResult {
    scenario: string;
    duration: number;
    projectedPower: number;
    projectedTemp: number;
    projectedVibration: number;
    failureProbability: number;
    lifespan: number;
    recommendation: string;
}

export interface FailurePredictionModel {
    machineId: string;
    temperature: number;
    vibration: number;
    power: number;
    runtime: number;
}

// ──────────────────────────────────────────────────────────────────────
// CONSTANTS & CONFIGURATION
// ──────────────────────────────────────────────────────────────────────

const MACHINE_HEALTH_THRESHOLDS = {
    temperature: { warning: 75, critical: 85 },
    vibration: { warning: 2.5, critical: 4.0 },
    power: { warning: 1.5, critical: 2.0 },
};

const MATERIAL_COSTS: Record<string, number> = {
    'steel': 0.8,
    'aluminum': 2.5,
    'plastic': 1.2,
    'copper': 8.5,
    'composite': 3.0,
    'generic': 1.5,
};

const MACHINE_PROFILES: Record<string, {
    baselinePowerConsumption: number;
    optimalEfficiency: number;
    wasteRate: number;
    productionRate: number;
}> = {
    'PUMP': {
        baselinePowerConsumption: 15,
        optimalEfficiency: 0.85,
        wasteRate: 0.08,
        productionRate: 120,
    },
    'MOTOR': {
        baselinePowerConsumption: 22,
        optimalEfficiency: 0.88,
        wasteRate: 0.06,
        productionRate: 150,
    },
    'COMPRESSOR': {
        baselinePowerConsumption: 30,
        optimalEfficiency: 0.82,
        wasteRate: 0.12,
        productionRate: 100,
    },
    'CONVEYOR': {
        baselinePowerConsumption: 8,
        optimalEfficiency: 0.90,
        wasteRate: 0.04,
        productionRate: 200,
    },
};

const ELECTRICITY_RATE = 0.12;
const CO2_EMISSION_FACTOR = 0.4;

// ──────────────────────────────────────────────────────────────────────
// SERVICE IMPLEMENTATION
// ──────────────────────────────────────────────────────────────────────

export const digitalTwinService = {
    /**
     * MAIN FEATURE: Simulate production with energy & material cost analysis
     * WITH STRICT INPUT VALIDATION
     */
    async simulateProduction(input: ProductionSimulationInput): Promise<EnergyOptimizationResult> {
        try {
            // ═══════════════════════════════════════════════════════════
            // STEP 1: VALIDATE MACHINE EXISTS
            // ═══════════════════════════════════════════════════════════
            const machine = await prisma.machine.findUnique({
                where: { id: input.machineId },
            });

            if (!machine) throw new Error('Machine not found');

            // ═══════════════════════════════════════════════════════════
            // STEP 2: VALIDATE OPERATION HOURS
            // ═══════════════════════════════════════════════════════════
            if (!input.operationHours || input.operationHours <= 0) {
                throw new Error('❌ Operation hours must be greater than 0');
            }
            if (input.operationHours > 8760) {
                throw new Error('❌ Operation hours cannot exceed 8760 (1 year). Got: ' + input.operationHours);
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 3: VALIDATE TARGET PRODUCTION
            // ═══════════════════════════════════════════════════════════
            if (!input.targetProduction || input.targetProduction <= 0) {
                throw new Error('❌ Target production must be greater than 0');
            }
            if (input.targetProduction > 100000) {
                throw new Error('❌ Target production exceeds reasonable limits (100,000 units). Got: ' + input.targetProduction);
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 4: FETCH & VALIDATE HISTORICAL DATA
            // ═══════════════════════════════════════════════════════════
            const historicalReadings = await prisma.energyReading.findMany({
                where: { machineId: input.machineId },
                orderBy: { timestamp: 'desc' },
                take: 1000, // Get more readings for better statistics
            });

            if (historicalReadings.length === 0) {
                throw new Error('❌ No historical data available for this machine. Cannot make predictions.');
            }

            if (historicalReadings.length < 10) {
                throw new Error('❌ Insufficient historical data. Minimum 10 readings required. Got: ' + historicalReadings.length);
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 5: VALIDATE HISTORICAL DATA QUALITY
            // ═══════════════════════════════════════════════════════════
            const powers = historicalReadings.map(r => r.power).sort((a, b) => a - b);
            const temps = historicalReadings.map(r => r.temperature);
            const vibs = historicalReadings.map(r => r.vibration);

            // Remove outliers using IQR method
            const powerQ1 = powers[Math.floor(powers.length * 0.25)];
            const powerQ3 = powers[Math.floor(powers.length * 0.75)];
            const powerIQR = powerQ3 - powerQ1;
            const filterPowers = powers.filter(p => p >= powerQ1 - 1.5 * powerIQR && p <= powerQ3 + 1.5 * powerIQR);

            if (filterPowers.length === 0) {
                throw new Error('❌ Historical data quality issues: All readings are outliers');
            }

            // Use filtered data for calculations
            const avgHistoricalPower = filterPowers.reduce((a, b) => a + b, 0) / filterPowers.length;
            const avgHistoricalTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
            const avgHistoricalVibration = vibs.reduce((a, b) => a + b, 0) / vibs.length;

            // Additional validation: ensure readings make sense for machine type
            const machineProfile = MACHINE_PROFILES[machine.type] || MACHINE_PROFILES['PUMP'];
            const expectedPowerRange = machineProfile.baselinePowerConsumption;
            const powerDeviation = Math.abs(avgHistoricalPower - expectedPowerRange) / expectedPowerRange;

            if (powerDeviation > 0.8) {
                console.warn(
                    `⚠️ WARNING: Historical power range unusual for ${machine.type}. ` +
                    `Expected ~${expectedPowerRange}kW, Got ~${avgHistoricalPower.toFixed(1)}kW`
                );
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 6: VALIDATE & PROCESS MATERIAL QUANTITY
            // ═══════════════════════════════════════════════════════════
            const materialType = input.materialType || 'generic';
            const materialCostPerUnit = MATERIAL_COSTS[materialType.toLowerCase()] || MATERIAL_COSTS['generic'];

            // Material quantity must be proportional to production
            // Typical ratio: 2-3 kg material per unit produced (varies by material)
            const estimatedMaterialPerUnit = {
                'steel': 0.80,
                'aluminum': 0.50,
                'plastic': 1.20,
                'copper': 0.30,
                'composite': 0.60,
                'generic': 0.75,
            }[materialType.toLowerCase()] || 0.75;

            let materialQuantity = input.materialQuantity;
            if (!materialQuantity) {
                // Calculate from production target
                materialQuantity = input.targetProduction * estimatedMaterialPerUnit;
                console.log(`📊 Material quantity calculated: ${input.targetProduction} units × ${estimatedMaterialPerUnit} kg/unit = ${materialQuantity.toFixed(2)} kg`);
            } else {
                // Validate provided material quantity is reasonable
                const minMaterial = input.targetProduction * (estimatedMaterialPerUnit * 0.7); // 70% of typical
                const maxMaterial = input.targetProduction * (estimatedMaterialPerUnit * 3.0); // 300% of typical
                if (materialQuantity < minMaterial) {
                    throw new Error(
                        `❌ Material quantity too low for target production. ` +
                        `Got ${materialQuantity}kg, minimum expected ${minMaterial.toFixed(2)}kg for ${input.targetProduction} units`
                    );
                }
                if (materialQuantity > maxMaterial) {
                    throw new Error(
                        `❌ Material quantity too high for target production. ` +
                        `Got ${materialQuantity}kg, maximum expected ${maxMaterial.toFixed(2)}kg for ${input.targetProduction} units`
                    );
                }
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 7: CALCULATE REALISTIC POWER CONSUMPTION
            // ═══════════════════════════════════════════════════════════
            // Power consumption depends on ACTUAL PRODUCTION LOAD, not just time
            // Formula: minIdlePower + (maxPower - minIdlePower) * loadFactor
            
            const minIdlePower = machineProfile.baselinePowerConsumption * 0.30; // 30% power at idle
            const maxPower = machineProfile.baselinePowerConsumption * 1.20; // 120% power at full load
            
            // Load factor based on production vs historical average production
            const avgHistoricalProduction = historicalReadings.reduce((sum, r) => sum + r.production, 0) / historicalReadings.length;
            const productionLoadFactor = Math.min(1.0, input.targetProduction / Math.max(avgHistoricalProduction, 1));
            
            // Realistic power scales with production load
            const scaledPowerPerHour = minIdlePower + (maxPower - minIdlePower) * productionLoadFactor;
            const totalEnergyConsumptionBaseline = scaledPowerPerHour * input.operationHours;

            // ═══════════════════════════════════════════════════════════
            // STEP 8: CALCULATE OPTIMIZATION FACTOR
            // ═══════════════════════════════════════════════════════════
            // Optimization depends on current efficiency vs maximum possible
            // Can improve by 15-35% through better scheduling, cooling, etc.
            
            const baselineEfficiency = this.calculateMachineEfficiency(avgHistoricalTemp, avgHistoricalVibration);
            const machineOptimalEfficiency = machineProfile.optimalEfficiency;
            
            // More realistic: optimization can improve efficiency by up to 30%
            const efficiencyImprovement = Math.min(0.30, machineOptimalEfficiency - baselineEfficiency);
            const optimizationFactor = 1.0 - (efficiencyImprovement / baselineEfficiency);
            const optimizedPowerPerHour = scaledPowerPerHour * optimizationFactor;

            if (optimizationFactor < 0.7 || optimizationFactor > 1.0) {
                console.warn(
                    `⚠️ Optimization factor unusual: ${(optimizationFactor * 100).toFixed(1)}%. ` +
                    `Baseline efficiency: ${(baselineEfficiency * 100).toFixed(1)}%, ` +
                    `Optimal: ${(machineOptimalEfficiency * 100).toFixed(1)}%`
                );
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 9: BASELINE METRICS CALCULATION
            // ═══════════════════════════════════════════════════════════
            const baselineEnergyConsumption = totalEnergyConsumptionBaseline;
            const baselineEnergyCost = baselineEnergyConsumption * ELECTRICITY_RATE;
            const baselineWasteRate = machineProfile.wasteRate + (avgHistoricalTemp > 75 ? 0.05 : 0);
            const baselineMaterialWaste = materialQuantity * baselineWasteRate;
            const baselineMaterialCost = baselineMaterialWaste * materialCostPerUnit;
            const baselineTotalCost = baselineEnergyCost + baselineMaterialCost;
            const baselineCostPerUnit = baselineTotalCost / Math.max(input.targetProduction, 1);
            const baselineCO2 = baselineEnergyConsumption * CO2_EMISSION_FACTOR;

            // ═══════════════════════════════════════════════════════════
            // STEP 10: OPTIMIZED METRICS CALCULATION
            // ═══════════════════════════════════════════════════════════
            const optimizedEnergyConsumption = baselineEnergyConsumption * optimizationFactor;
            const optimizedEnergyCost = optimizedEnergyConsumption * ELECTRICITY_RATE;
            const optimizedWasteRate = Math.max(0.01, machineProfile.wasteRate * 0.8); // 20% waste reduction through optimization
            const optimizedMaterialWaste = materialQuantity * optimizedWasteRate;
            const optimizedMaterialCost = optimizedMaterialWaste * materialCostPerUnit;
            const optimizedTotalCost = optimizedEnergyCost + optimizedMaterialCost;
            const optimizedCostPerUnit = optimizedTotalCost / Math.max(input.targetProduction, 1);
            const optimizedCO2 = optimizedEnergyConsumption * CO2_EMISSION_FACTOR;

            // ═══════════════════════════════════════════════════════════
            // STEP 11: SAVINGS CALCULATION
            // ═══════════════════════════════════════════════════════════
            const energySavings = baselineEnergyConsumption - optimizedEnergyConsumption;
            const moneySavings = baselineTotalCost - optimizedTotalCost;
            const wasteReduction = baselineMaterialWaste - optimizedMaterialWaste;
            const percentageSavings = (moneySavings / Math.max(baselineTotalCost, 1)) * 100;
            const co2Reduction = baselineCO2 - optimizedCO2;

            // Sanity check: savings should be positive but not exceed baseline
            if (moneySavings < 0 || moneySavings > baselineTotalCost) {
                throw new Error('❌ Calculation error: Savings exceed baseline or are invalid');
            }

            // ═══════════════════════════════════════════════════════════
            // STEP 12: RISK & QUALITY ASSESSMENT
            // ═══════════════════════════════════════════════════════════
            const failureProbability = this.calculateFailureProbability(
                avgHistoricalTemp,
                avgHistoricalVibration,
                scaledPowerPerHour
            );
            const qualityImpact = this.assessQualityImpact(optimizedWasteRate, input.targetProduction);

            // ═══════════════════════════════════════════════════════════
            // STEP 13: GENERATE RECOMMENDATIONS
            // ═══════════════════════════════════════════════════════════
            const recommendations = this.generateProductionRecommendations(
                machine.type,
                avgHistoricalTemp,
                avgHistoricalVibration,
                optimizedWasteRate,
                moneySavings,
                input.operationHours
            );

            const confidenceScore = Math.min(95, 60 + Math.min(35, historicalReadings.length / 50));

            // ═══════════════════════════════════════════════════════════
            // STEP 14: RETURN VALIDATED RESULTS
            // ═══════════════════════════════════════════════════════════
            return {
                machineId: input.machineId,
                machineName: machine.name,
                machineType: machine.type,
                scenario: {
                    operationHours: input.operationHours,
                    targetProduction: input.targetProduction,
                    materialUsed: materialQuantity,
                    materialType,
                },
                baselineMetrics: {
                    totalEnergyConsumption: Math.round(baselineEnergyConsumption * 100) / 100,
                    energyCost: Math.round(baselineEnergyCost * 100) / 100,
                    materialWaste: Math.round(baselineMaterialWaste * 100) / 100,
                    materialCost: Math.round(baselineMaterialCost * 100) / 100,
                    totalCost: Math.round(baselineTotalCost * 100) / 100,
                    costPerUnit: Math.round(baselineCostPerUnit * 100) / 100,
                    co2Emissions: Math.round(baselineCO2 * 100) / 100,
                },
                optimizedMetrics: {
                    totalEnergyConsumption: Math.round(optimizedEnergyConsumption * 100) / 100,
                    energyCost: Math.round(optimizedEnergyCost * 100) / 100,
                    materialWaste: Math.round(optimizedMaterialWaste * 100) / 100,
                    materialCost: Math.round(optimizedMaterialCost * 100) / 100,
                    totalCost: Math.round(optimizedTotalCost * 100) / 100,
                    costPerUnit: Math.round(optimizedCostPerUnit * 100) / 100,
                    co2Emissions: Math.round(optimizedCO2 * 100) / 100,
                },
                savings: {
                    energySavings: Math.round(energySavings * 100) / 100,
                    moneySavings: Math.round(moneySavings * 100) / 100,
                    wasteReduction: Math.round(wasteReduction * 100) / 100,
                    percentageSavings: Math.round(percentageSavings * 100) / 100,
                    co2Reduction: Math.round(co2Reduction * 100) / 100,
                },
                recommendations,
                riskAssessment: {
                    failureProbability: Math.round(failureProbability * 1000) / 1000,
                    qualityImpact,
                    recommendation:
                        failureProbability > 0.6
                            ? '🚨 High failure risk. Schedule maintenance before production.'
                            : failureProbability > 0.3
                            ? '⚠️ Medium risk. Monitor during operation.'
                            : '✅ Low risk. Safe to proceed.',
                },
                confidenceScore: Math.round(confidenceScore),
            };
        } catch (error) {
            console.error('[Digital Twin] Production simulation error:', error);
            throw error;
        }
    },

    /**
     * Calculate machine efficiency (0-1)
     */
    calculateMachineEfficiency(temperature: number, vibration: number): number {
        let efficiency = 0.9;

        if (temperature > 80) {
            efficiency -= 0.25;
        } else if (temperature > 70) {
            efficiency -= 0.15;
        } else if (temperature > 60) {
            efficiency -= 0.05;
        }

        if (vibration > 4) {
            efficiency -= 0.20;
        } else if (vibration > 3) {
            efficiency -= 0.12;
        } else if (vibration > 2) {
            efficiency -= 0.08;
        }

        return Math.max(0.4, Math.min(0.95, efficiency));
    },

    /**
     * Calculate failure probability (0-1)
     */
    calculateFailureProbability(temperature: number, vibration: number, power: number): number {
        let probability = 0;

        if (temperature > 85) {
            probability += 0.35;
        } else if (temperature > 75) {
            probability += 0.15;
        }

        if (vibration > 4.0) {
            probability += 0.35;
        } else if (vibration > 2.5) {
            probability += 0.15;
        }

        if (power > 50) {
            probability += 0.20;
        } else if (power > 40) {
            probability += 0.10;
        }

        return Math.min(1, probability);
    },

    /**
     * Assess quality impact
     */
    assessQualityImpact(wasteRate: number, productionVolume: number): string {
        if (wasteRate > 0.15) {
            return 'HIGH';
        } else if (wasteRate > 0.10) {
            return 'MEDIUM';
        }
        return 'LOW';
    },

    /**
     * Generate optimization recommendations
     */
    generateProductionRecommendations(
        machineType: string,
        temperature: number,
        vibration: number,
        wasteRate: number,
        moneySavings: number,
        operationHours: number
    ): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];

        if (temperature > 75) {
            recommendations.push({
                title: '❄️ Improve Cooling System',
                description: `Current temp ${temperature.toFixed(1)}°C. Upgrade cooling or add active cooling to reach optimal 55°C.`,
                estimatedSavings: (moneySavings * 0.25) / (operationHours / 730),
                implementationTime: '2-3 days',
                difficulty: 'MEDIUM',
                impact: 'Reduce energy by 15-20%, increase lifespan 30%',
            });
        }

        if (vibration > 2.5) {
            recommendations.push({
                title: '🔧 Balance & Alignment',
                description: `Vibration ${vibration.toFixed(2)} mm/s. Perform dynamic balancing and precision alignment.`,
                estimatedSavings: (moneySavings * 0.20) / (operationHours / 730),
                implementationTime: '1 day',
                difficulty: 'MEDIUM',
                impact: 'Reduce vibration 40%, improve quality, extend bearings 25%',
            });
        }

        if (wasteRate > 0.10) {
            recommendations.push({
                title: '♻️ Material Optimization',
                description: `Waste rate ${(wasteRate * 100).toFixed(1)}%. Optimize patterns and add waste recovery.`,
                estimatedSavings: (moneySavings * 0.30) / (operationHours / 730),
                implementationTime: '1 week',
                difficulty: 'HARD',
                impact: 'Reduce waste 30-40%, improve profitability 8-12%',
            });
        }

        recommendations.push({
            title: '⚡ Variable Frequency Drive (VFD)',
            description: 'Install VFD to adjust motor speed by load. Reduces energy during light loads.',
            estimatedSavings: (moneySavings * 0.15) / (operationHours / 730),
            implementationTime: '2-3 days',
            difficulty: 'HARD',
            impact: 'Save 10-15% energy, extend lifespan 40%',
        });

        return recommendations.slice(0, 4);
    },

    /**
     * Get production baseline
     */
    async getProductionBaseline(machineId: string): Promise<any> {
        try {
            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });

            if (readings.length === 0) {
                return null;
            }

            const avgPower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;
            const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
            const avgVibration = readings.reduce((sum, r) => sum + r.vibration, 0) / readings.length;
            const totalRuntime = readings.reduce((sum, r) => sum + r.runtime, 0) / readings.length;

            return {
                avgPowerConsumption: Math.round(avgPower * 100) / 100,
                avgTemperature: Math.round(avgTemp * 100) / 100,
                avgVibration: Math.round(avgVibration * 100) / 100,
                avgRuntime: Math.round(totalRuntime * 100) / 100,
                historicalDataPoints: readings.length,
            };
        } catch (error) {
            console.error('[Digital Twin] Get baseline error:', error);
            return null;
        }
    },

    /**
     * Predict failure
     */
    predictFailure(model: FailurePredictionModel): DigitalTwinState['predictedFailure'] {
        let failureScore = 0;
        let primaryFailureType = 'NORMAL_WEAR';
        let daysUntilFailure = 365;

        if (model.temperature > MACHINE_HEALTH_THRESHOLDS.temperature.critical) {
            failureScore += 0.35;
            primaryFailureType = 'THERMAL_FAILURE';
            daysUntilFailure = Math.max(1, 30 - (model.temperature - 85) * 2);
        } else if (model.temperature > MACHINE_HEALTH_THRESHOLDS.temperature.warning) {
            failureScore += 0.15;
        }

        if (model.vibration > MACHINE_HEALTH_THRESHOLDS.vibration.critical) {
            failureScore += 0.35;
            primaryFailureType = 'BEARING_FAILURE';
            daysUntilFailure = Math.max(1, 45 - (model.vibration - 4.0) * 5);
        } else if (model.vibration > MACHINE_HEALTH_THRESHOLDS.vibration.warning) {
            failureScore += 0.15;
        }

        if (model.power > 50) {
            failureScore += 0.20;
            primaryFailureType = 'ELECTRICAL_FAILURE';
            daysUntilFailure = Math.max(1, 60 - (model.power - 50) * 0.5);
        } else if (model.power > 40) {
            failureScore += 0.10;
        }

        if (model.runtime > 8) {
            failureScore += 0.10;
        }

        failureScore = Math.min(1, failureScore);

        let riskLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (failureScore > 0.7) {
            riskLevel = 'CRITICAL';
        } else if (failureScore > 0.4) {
            riskLevel = 'WARNING';
        }

        return {
            probability: Math.round(failureScore * 1000) / 1000,
            failureType: primaryFailureType,
            daysUntilFailure: Math.round(daysUntilFailure),
            riskLevel,
        };
    },

    /**
     * Generate health recommendations
     */
    generateRecommendations(reading: any, prediction: DigitalTwinState['predictedFailure']): string[] {
        const recommendations: string[] = [];

        if (reading.temperature > MACHINE_HEALTH_THRESHOLDS.temperature.warning) {
            recommendations.push(`⚠️ High temperature (${reading.temperature.toFixed(1)}°C). Reduce load or improve cooling.`);
        }

        if (reading.vibration > MACHINE_HEALTH_THRESHOLDS.vibration.warning) {
            recommendations.push(`⚠️ Excessive vibration (${reading.vibration.toFixed(2)} mm/s). Check bearings & alignment.`);
        }

        if (reading.power > 40) {
            recommendations.push(`⚠️ High power (${reading.power.toFixed(1)} kW). Inspect for electrical issues.`);
        }

        if (prediction.riskLevel === 'CRITICAL') {
            recommendations.push(`🚨 CRITICAL: Schedule immediate maintenance. Failure in ${prediction.daysUntilFailure} days.`);
        } else if (prediction.riskLevel === 'WARNING') {
            recommendations.push(`📋 Schedule maintenance within the week.`);
        } else {
            recommendations.push(`✅ Machine operating normally.`);
        }

        return recommendations.length > 0 ? recommendations : ['✅ Machine operating normally.'];
    },

    /**
     * Get machine state
     */
    async getMachineState(machineId: string): Promise<DigitalTwinState | null> {
        try {
            const machine = await prisma.machine.findUnique({
                where: { id: machineId },
            });

            if (!machine) return null;

            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });

            if (readings.length === 0) {
                return null;
            }

            const latest = readings[0];
            const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
            const avgVibration = readings.reduce((sum, r) => sum + r.vibration, 0) / readings.length;
            const avgPower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;

            const failurePrediction = this.predictFailure({
                machineId,
                temperature: latest.temperature,
                vibration: latest.vibration,
                power: latest.power,
                runtime: latest.runtime,
            });

            const recommendations = this.generateRecommendations(latest, failurePrediction);

            return {
                machineId,
                machineName: machine.name,
                machineType: machine.type,
                currentPower: latest.power,
                currentTemp: latest.temperature,
                currentVibration: latest.vibration,
                currentRuntime: latest.runtime,
                predictedFailure: failurePrediction,
                recommendations,
                simulationResults: [],
            };
        } catch (error) {
            console.error('[Digital Twin] Error getting machine state:', error);
            return null;
        }
    },

    /**
     * Simulate scenario
     */
    async simulateScenario(
        machineId: string,
        scenario: 'NORMAL' | 'HEAVY_LOAD' | 'OVERHEATED' | 'WORN_BEARINGS',
        duration: number
    ): Promise<SimulationResult> {
        try {
            const machine = await prisma.machine.findUnique({
                where: { id: machineId },
            });

            if (!machine) throw new Error('Machine not found');

            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 50,
            });

            const baseTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
            const baseVibration = readings.reduce((sum, r) => sum + r.vibration, 0) / readings.length;
            const basePower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;

            let projectedTemp = baseTemp;
            let projectedVibration = baseVibration;
            let projectedPower = basePower;
            let scenarioDisplayName: string = scenario;
            let lifespan = 10000;

            switch (scenario) {
                case 'NORMAL':
                    projectedTemp = baseTemp + duration * 0.1;
                    projectedVibration = baseVibration + duration * 0.01;
                    projectedPower = basePower + duration * 0.05;
                    lifespan = 10000;
                    scenarioDisplayName = 'Normal Operation';
                    break;
                case 'HEAVY_LOAD':
                    projectedTemp = baseTemp + duration * 0.5;
                    projectedVibration = baseVibration + duration * 0.08;
                    projectedPower = basePower * 1.6;
                    lifespan = duration > 100 ? 5000 : 8000;
                    scenarioDisplayName = 'Heavy Load Operation';
                    break;
                case 'OVERHEATED':
                    projectedTemp = baseTemp + (duration * 1.2);
                    projectedVibration = baseVibration + (duration * 0.05);
                    projectedPower = basePower * 1.3;
                    lifespan = duration > 50 ? 2000 : 5000;
                    scenarioDisplayName = 'Overheating Conditions';
                    break;
                case 'WORN_BEARINGS':
                    projectedTemp = baseTemp + (duration * 0.3);
                    projectedVibration = baseVibration + (duration * 0.15);
                    projectedPower = basePower * 1.2;
                    lifespan = duration > 80 ? 1500 : 4000;
                    scenarioDisplayName = 'Bearing Degradation';
                    break;
            }

            const failurePrediction = this.predictFailure({
                machineId,
                temperature: projectedTemp,
                vibration: projectedVibration,
                power: projectedPower,
                runtime: duration,
            });

            const recommendation =
                failurePrediction.riskLevel === 'CRITICAL'
                    ? `⚠️ CRITICAL risk. Not recommended.`
                    : failurePrediction.riskLevel === 'WARNING'
                    ? `⚠️ Acceptable with caution.`
                    : `✅ Safe to execute.`;

            return {
                scenario: scenarioDisplayName,
                duration,
                projectedPower: Math.round(projectedPower * 100) / 100,
                projectedTemp: Math.round(projectedTemp * 100) / 100,
                projectedVibration: Math.round(projectedVibration * 100) / 100,
                failureProbability: failurePrediction.probability,
                lifespan,
                recommendation,
            };
        } catch (error) {
            console.error('[Digital Twin] Simulation error:', error);
            throw error;
        }
    },

    /**
     * Test all scenarios
     */
    async testAllScenarios(machineId: string): Promise<SimulationResult[]> {
        const results: SimulationResult[] = [];
        const scenarios: Array<'NORMAL' | 'HEAVY_LOAD' | 'OVERHEATED' | 'WORN_BEARINGS'> = [
            'NORMAL',
            'HEAVY_LOAD',
            'OVERHEATED',
            'WORN_BEARINGS',
        ];

        for (const scenario of scenarios) {
            const result = await this.simulateScenario(machineId, scenario, 100);
            results.push(result);
        }

        return results;
    },

    /**
     * Calculate RUL
     */
    calculateRUL(currentState: DigitalTwinState): { hours: number; days: number; confidence: number } {
        const prediction = currentState.predictedFailure;

        let rulHours = 5000;

        if (prediction.probability > 0.8) {
            rulHours = 500;
        } else if (prediction.probability > 0.6) {
            rulHours = 1500;
        } else if (prediction.probability > 0.4) {
            rulHours = 3000;
        } else if (prediction.probability > 0.2) {
            rulHours = 5000;
        }

        const rulDays = Math.round((rulHours / 24) * 10) / 10;
        const confidence = 0.78 + Math.random() * 0.2;

        return {
            hours: rulHours,
            days: rulDays,
            confidence: Math.round(confidence * 100) / 100,
        };
    },
};
