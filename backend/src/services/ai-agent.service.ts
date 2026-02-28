import { prisma } from '../prisma/client';
import { digitalTwinService } from './digital-twin.service';
import { geminiService } from './gemini.service';

// ══════════════════════════════════════════════════════════════════════════════
// AI AGENT CORE TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface MachineMonitoringData {
    machineId: string;
    machineName: string;
    machineType: string;
    currentMetrics: {
        power: number;
        temperature: number;
        vibration: number;
        runtime: number;
        production: number;
    };
    state: 'NORMAL' | 'WARNING' | 'CRITICAL';
    abnormalityScore: number; // 0-1, where 1 is most abnormal
}

export interface AnomalyDetectionResult {
    machineId: string;
    anomalyDetected: boolean;
    anomalyType: 'OVERHEAT' | 'VIBRATION' | 'LOAD_SPIKE' | 'EFFICIENCY_DROP' | 'NONE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number; // 0-1
    description: string;
    affectedMetric: string;
    normalValue?: number;
    currentValue?: number;
    suggestedAction: string;
}

export interface PredictiveMaintenanceResult {
    machineId: string;
    failureProbability: number; // 0-1
    estimatedRUL: number; // days
    failureType?: string;
    maintenanceType: 'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION_BASED';
    recommendedSchedule: {
        daysUntil: number;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        estimatedDowntime: number; // hours
        estimatedCost: number;
    };
}

export interface EnergyOptimizationDecision {
    machineId: string;
    currentEnergyCost: number;
    baselineEnergy: number;
    optimizedEnergy: number;
    potentialSavings: number;
    recommendations: {
        action: string;
        impactPercentage: number;
        implementationTime: string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }[];
}

export interface AutonomousDecision {
    machineId: string;
    timestamp: Date;
    decision: 'CONTINUE' | 'REDUCE_LOAD' | 'ACTIVATE_COOLING' | 'SCHEDULE_MAINTENANCE' | 'STOP';
    confidence: number; // 0-1
    dataPoints: {
        temperature: number;
        vibration: number;
        power: number;
        failureProbability: number;
        anomalyScore: number;
    };
    reasoning: {
        mainFactor: string;
        explanation: string;
        considerFactors: string[];
        safetyMargin: number;
    };
    actionableInsights: string[];
    estimatedImpact: {
        energySavings?: number;
        riskReduction?: number;
        costImpact: number;
    };
}

export interface AIAgentReport {
    machineId: string;
    machineName: string;
    reportTimestamp: Date;
    monitoring: MachineMonitoringData;
    anomalies: AnomalyDetectionResult[];
    predictiveMaintenance: PredictiveMaintenanceResult;
    energyOptimization: EnergyOptimizationDecision;
    autonomousDecision: AutonomousDecision;
    executiveSummary: {
        healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
        overallScore: number; // 0-100
        keyIssues: string[];
        recommendedActions: string[];
        estimatedROI: number;
    };
}

export interface LearningData {
    machineId: string;
    decision: string;
    outcome: string;
    timestamp: Date;
    improvement: number; // -1 to 1, where 1 is best outcome
    feedbackSource: 'HUMAN' | 'AUTOMATED' | 'SYSTEM_METRIC';
}

// ══════════════════════════════════════════════════════════════════════════════
// NEXOVA AUTONOMOUS AI AGENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export const aiAgentService = {
    /**
     * 1️⃣ REAL-TIME INDUSTRIAL MONITORING
     * Continuously analyzes sensor data and classifies machine state
     */
    async monitorMachine(machineId: string): Promise<MachineMonitoringData> {
        try {
            const machine = await prisma.machine.findUnique({
                where: { id: machineId },
            });

            if (!machine) throw new Error('Machine not found');

            // Get latest sensor readings (last 100 readings)
            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });

            if (readings.length === 0) throw new Error('No sensor data available');

            const latest = readings[0];
            const avgTemperature = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
            const avgVibration = readings.reduce((sum, r) => sum + r.vibration, 0) / readings.length;
            const avgPower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;

            // Calculate abnormality score (0-1)
            let abnormalityScore = 0;

            // Temperature evaluation
            if (latest.temperature > 85) abnormalityScore += 0.3;
            else if (latest.temperature > 75) abnormalityScore += 0.15;

            // Vibration evaluation
            if (latest.vibration > 5) abnormalityScore += 0.3;
            else if (latest.vibration > 3) abnormalityScore += 0.15;

            // Power spike detection
            const powerSpike = Math.abs(latest.power - avgPower) / avgPower;
            if (powerSpike > 0.4) abnormalityScore += 0.25;
            else if (powerSpike > 0.2) abnormalityScore += 0.12;

            abnormalityScore = Math.min(1, abnormalityScore);

            // Classify machine state
            let state: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
            if (abnormalityScore > 0.7) state = 'CRITICAL';
            else if (abnormalityScore > 0.4) state = 'WARNING';

            return {
                machineId,
                machineName: machine.name,
                machineType: machine.type,
                currentMetrics: {
                    power: latest.power,
                    temperature: latest.temperature,
                    vibration: latest.vibration,
                    runtime: latest.runtime,
                    production: latest.production,
                },
                state,
                abnormalityScore: Math.round(abnormalityScore * 1000) / 1000,
            };
        } catch (error) {
            console.error('[AI Agent] Monitoring error:', error);
            throw error;
        }
    },

    /**
     * 2️⃣ INTELLIGENT ANOMALY DETECTION
     * Detects overheating, energy spikes, and hidden abnormal patterns
     */
    async detectAnomalies(machineId: string): Promise<AnomalyDetectionResult[]> {
        try {
            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 200,
            });

            if (readings.length < 10) throw new Error('Insufficient data for anomaly detection');

            const anomalies: AnomalyDetectionResult[] = [];
            const latest = readings[0];

            // Calculate statistics
            const temperatures = readings.map(r => r.temperature);
            const vibrations = readings.map(r => r.vibration);
            const powers = readings.map(r => r.power);

            const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
            const stdDev = (arr: number[], mean: number) => {
                const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
                return Math.sqrt(variance);
            };

            const avgTemp = avg(temperatures);
            const stdTemp = stdDev(temperatures, avgTemp);
            const avgVib = avg(vibrations);
            const stdVib = stdDev(vibrations, avgVib);
            const avgPower = avg(powers);
            const stdPower = stdDev(powers, avgPower);

            // 🌡️ OVERHEAT ANOMALY
            if (latest.temperature > avgTemp + 2.5 * stdTemp || latest.temperature > 85) {
                anomalies.push({
                    machineId,
                    anomalyDetected: true,
                    anomalyType: 'OVERHEAT',
                    severity: latest.temperature > 90 ? 'CRITICAL' : latest.temperature > 80 ? 'HIGH' : 'MEDIUM',
                    confidence: Math.min(1, (latest.temperature - avgTemp) / (2.5 * stdTemp)),
                    description: `Machine temperature is ${latest.temperature}°C, which is significantly above normal (avg: ${avgTemp.toFixed(1)}°C)`,
                    affectedMetric: 'Temperature',
                    normalValue: avgTemp,
                    currentValue: latest.temperature,
                    suggestedAction: 'Activate cooling system, increase ventilation, or reduce load',
                });
            }

            // 📳 VIBRATION ANOMALY
            if (latest.vibration > avgVib + 2.5 * stdVib || latest.vibration > 5) {
                anomalies.push({
                    machineId,
                    anomalyDetected: true,
                    anomalyType: 'VIBRATION',
                    severity: latest.vibration > 6 ? 'CRITICAL' : latest.vibration > 4 ? 'HIGH' : 'MEDIUM',
                    confidence: Math.min(1, (latest.vibration - avgVib) / (2.5 * stdVib)),
                    description: `Abnormal vibration detected: ${latest.vibration} mm/s (normal: ${avgVib.toFixed(2)} mm/s)`,
                    affectedMetric: 'Vibration',
                    normalValue: avgVib,
                    currentValue: latest.vibration,
                    suggestedAction: 'Perform mechanical inspection, check alignment and bearings',
                });
            }

            // ⚡ ENERGY SPIKE ANOMALY
            const powerDifference = (latest.power - avgPower) / avgPower;
            if (powerDifference > 0.5) {
                anomalies.push({
                    machineId,
                    anomalyDetected: true,
                    anomalyType: 'LOAD_SPIKE',
                    severity: powerDifference > 0.8 ? 'HIGH' : 'MEDIUM',
                    confidence: Math.min(1, Math.abs(powerDifference)),
                    description: `Unexpected power spike: ${latest.power.toFixed(1)} kW (baseline: ${avgPower.toFixed(1)} kW)`,
                    affectedMetric: 'Power Consumption',
                    normalValue: avgPower,
                    currentValue: latest.power,
                    suggestedAction: 'Investigate load increase, check for process anomalies',
                });
            }

            // 📉 EFFICIENCY DROP
            const recentEfficiency = avg(powers.slice(0, 20)) / avgPower;
            if (recentEfficiency > 1.15) {
                anomalies.push({
                    machineId,
                    anomalyDetected: true,
                    anomalyType: 'EFFICIENCY_DROP',
                    severity: recentEfficiency > 1.3 ? 'HIGH' : 'MEDIUM',
                    confidence: Math.min(1, (recentEfficiency - 1) / 0.3),
                    description: `Machine efficiency has decreased. Recent avg power 15%+ above baseline`,
                    affectedMetric: 'Efficiency',
                    normalValue: avgPower,
                    currentValue: avg(powers.slice(0, 20)),
                    suggestedAction: 'Schedule preventive maintenance, check for worn components',
                });
            }

            return anomalies;
        } catch (error) {
            console.error('[AI Agent] Anomaly detection error:', error);
            throw error;
        }
    },

    /**
     * 3️⃣ PREDICTIVE MAINTENANCE ENGINE
     * Predicts failures and recommends maintenance timing
     */
    async predictMaintenance(machineId: string): Promise<PredictiveMaintenanceResult> {
        try {
            // Get machine and historical data
            const machine = await prisma.machine.findUnique({
                where: { id: machineId },
            });

            if (!machine) throw new Error('Machine not found');

            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 500,
            });

            if (readings.length < 50) throw new Error('Insufficient historical data');

            const latest = readings[0];
            const machineAge = Math.floor((Date.now() - new Date(machine.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            // Calculate degradation indicators
            const recentPower = readings.slice(0, 50).map(r => r.power);
            const oldPower = readings.slice(-50).map(r => r.power);
            const avgRecentPower = recentPower.reduce((a, b) => a + b, 0) / recentPower.length;
            const avgOldPower = oldPower.reduce((a, b) => a + b, 0) / oldPower.length;
            const powerDegradation = (avgRecentPower - avgOldPower) / avgOldPower;

            // Temperature trend
            const recentTemp = readings.slice(0, 50).map(r => r.temperature);
            const avgRecentTemp = recentTemp.reduce((a, b) => a + b, 0) / recentTemp.length;
            const tempTrend = avgRecentTemp > 75 ? 0.3 : 0;

            // Vibration trend
            const recentVib = readings.slice(0, 50).map(r => r.vibration);
            const avgRecentVib = recentVib.reduce((a, b) => a + b, 0) / recentVib.length;
            const vibrationTrend = avgRecentVib > 3.5 ? 0.3 : 0;

            // Calculate failure probability (0-1)
            let failureProbability = 0;
            failureProbability += Math.min(0.4, Math.max(0, powerDegradation * 0.5)); // Up to 40% from degradation
            failureProbability += tempTrend; // Up to 30% from temperature
            failureProbability += vibrationTrend; // Up to 30% from vibration
            failureProbability = Math.min(1, failureProbability);

            // Estimate RUL (days) with machine age consideration
            const baseRUL = 365; // 1 year baseline
            const ageRUL = Math.max(7, baseRUL - (machineAge / 10)); // Degrade by 10 days per year of operation
            const healthRUL = ageRUL * (1 - failureProbability);
            const estimatedRUL = Math.max(7, Math.floor(healthRUL));

            // Determine maintenance type
            let maintenanceType: 'PREVENTIVE' | 'PREDICTIVE' | 'CONDITION_BASED' = 'PREVENTIVE';
            if (failureProbability > 0.6) maintenanceType = 'CONDITION_BASED';
            if (failureProbability > 0.3 && failureProbability <= 0.6) maintenanceType = 'PREDICTIVE';

            // Priority
            let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'LOW';
            if (estimatedRUL < 7) priority = 'URGENT';
            else if (estimatedRUL < 30) priority = 'HIGH';
            else if (estimatedRUL < 90) priority = 'MEDIUM';

            return {
                machineId,
                failureProbability: Math.round(failureProbability * 1000) / 1000,
                estimatedRUL,
                failureType: failureProbability > 0.5
                    ? avgRecentTemp > 80
                        ? 'Bearing/Motor Overheat'
                        : avgRecentVib > 4
                        ? 'Bearing Wear/Misalignment'
                        : 'Component Fatigue'
                    : undefined,
                maintenanceType,
                recommendedSchedule: {
                    daysUntil: estimatedRUL,
                    priority,
                    estimatedDowntime: Math.ceil(estimatedRUL / 30), // Roughly 1 hour per month of operation left
                    estimatedCost: failureProbability > 0.6 ? 5000 : failureProbability > 0.3 ? 2000 : 1000,
                },
            };
        } catch (error) {
            console.error('[AI Agent] Predictive maintenance error:', error);
            throw error;
        }
    },

    /**
     * 4️⃣ ENERGY OPTIMIZATION INTELLIGENCE
     * Suggests load balancing and energy-saving strategies
     */
    async optimizeEnergy(machineId: string): Promise<EnergyOptimizationDecision> {
        try {
            const readings = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 168, // 1 week of hourly data
            });

            if (readings.length === 0) throw new Error('No energy data available');

            const avgPower = readings.reduce((sum, r) => sum + r.power, 0) / readings.length;
            const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
            const avgVib = readings.reduce((sum, r) => sum + r.vibration, 0) / readings.length;

            const currentEnergyCost = avgPower * 168 * 0.12; // 7 days * hourly rate
            const electricityRate = 0.12; // $/kWh

            // Calculate optimization potential
            const recommendations = [];

            // Cooling optimization
            if (avgTemp > 70) {
                const tempOptimizedPower = avgPower * (avgTemp > 80 ? 0.85 : 0.92);
                const savingsPercent = ((avgPower - tempOptimizedPower) / avgPower) * 100;
                recommendations.push({
                    action: 'Improve cooling efficiency to reduce operating temperature',
                    impactPercentage: savingsPercent,
                    implementationTime: '2-3 days',
                    riskLevel: 'LOW' as const,
                });
            }

            // Vibration-based optimization
            if (avgVib > 2.5) {
                recommendations.push({
                    action: 'Perform alignment and balancing to reduce vibration losses',
                    impactPercentage: 5,
                    implementationTime: '1 day',
                    riskLevel: 'LOW' as const,
                });
            }

            // Load balancing
            const maxPower = Math.max(...readings.map(r => r.power));
            const minPower = Math.min(...readings.map(r => r.power));
            const loadVariance = ((maxPower - minPower) / avgPower) * 100;

            if (loadVariance > 40) {
                recommendations.push({
                    action: 'Implement load balancing strategy to reduce peak demands',
                    impactPercentage: Math.min(12, loadVariance / 10),
                    implementationTime: '1-2 weeks',
                    riskLevel: 'MEDIUM' as const,
                });
            }

            // VFD recommendation
            if (avgPower > 15) {
                recommendations.push({
                    action: 'Install Variable Frequency Drive (VFD) for dynamic speed control',
                    impactPercentage: 10,
                    implementationTime: '3-5 days',
                    riskLevel: 'MEDIUM' as const,
                });
            }

            // Predictive maintenance for efficiency
            recommendations.push({
                action: 'Execute preventive maintenance to restore efficiency',
                impactPercentage: 8,
                implementationTime: '1 day',
                riskLevel: 'LOW' as const,
            });

            // Calculate optimized energy
            const totalOptimizationPercent = recommendations.reduce((sum, r) => sum + (r.impactPercentage * 0.6), 0); // 60% achievable
            const optimizedPower = avgPower * (1 - (totalOptimizationPercent / 100));
            const optimizedEnergyCost = optimizedPower * 168 * electricityRate;

            return {
                machineId,
                currentEnergyCost: Math.round(currentEnergyCost * 100) / 100,
                baselineEnergy: avgPower,
                optimizedEnergy: optimizedPower,
                potentialSavings: Math.round((currentEnergyCost - optimizedEnergyCost) * 100) / 100,
                recommendations,
            };
        } catch (error) {
            console.error('[AI Agent] Energy optimization error:', error);
            throw error;
        }
    },

    /**
     * 5️⃣ AUTONOMOUS DECISION-MAKING SYSTEM
     * Makes intelligent decisions based on all factors
     */
    async makeAutonomousDecision(machineId: string): Promise<AutonomousDecision> {
        try {
            // Gather all intelligence
            const monitoring = await this.monitorMachine(machineId);
            const anomalies = await this.detectAnomalies(machineId);
            const maintenance = await this.predictMaintenance(machineId);
            const energy = await this.optimizeEnergy(machineId);

            const currentMetrics = monitoring.currentMetrics;
            let decision: 'CONTINUE' | 'REDUCE_LOAD' | 'ACTIVATE_COOLING' | 'SCHEDULE_MAINTENANCE' | 'STOP' = 'CONTINUE';
            let confidence = 1;
            let mainFactor = 'Machine operating within normal parameters';

            const considerFactors: string[] = [];

            // Critical threshold checks
            if (currentMetrics.temperature > 90) {
                decision = 'ACTIVATE_COOLING';
                confidence = 0.95;
                mainFactor = 'Critical temperature detected';
                considerFactors.push('Temperature critically high');
            } else if (currentMetrics.vibration > 6) {
                decision = 'REDUCE_LOAD';
                confidence = 0.9;
                mainFactor = 'Excessive vibration detected';
                considerFactors.push('Vibration levels critical');
            } else if (maintenance.failureProbability > 0.8) {
                decision = 'SCHEDULE_MAINTENANCE';
                confidence = 0.85;
                mainFactor = 'High failure probability';
                considerFactors.push(`Failure risk: ${(maintenance.failureProbability * 100).toFixed(0)}%`);
            } else if (monitoring.state === 'CRITICAL') {
                decision = 'REDUCE_LOAD';
                confidence = 0.8;
                mainFactor = 'Machine in critical state';
                considerFactors.push('Multiple anomalies detected');
            } else if (monitoring.state === 'WARNING') {
                if (currentMetrics.temperature > 75) decision = 'ACTIVATE_COOLING';
                if (currentMetrics.vibration > 3.5) decision = 'REDUCE_LOAD';
                confidence = 0.7;
                considerFactors.push('Machine in warning state');
            }

            // Add anomaly factors
            if (anomalies.length > 0) {
                considerFactors.push(`${anomalies.length} anomalies detected`);
                anomalies.forEach(a => considerFactors.push(`- ${a.anomalyType}: ${a.severity}`));
            }

            // Safety margin calculation
            const safetyMargin = Math.max(
                0,
                Math.min(
                    1,
                    (90 - currentMetrics.temperature) / 20, // Temp margin
                    (6 - currentMetrics.vibration) / 3 // Vib margin
                )
            );

            // Generate explanation
            let explanation = '';
            switch (decision) {
                case 'CONTINUE':
                    explanation = 'Machine is operating optimally with all parameters within safe limits. Continue current operation.';
                    break;
                case 'ACTIVATE_COOLING':
                    explanation = `Temperature is rising (${currentMetrics.temperature}°C). Activating cooling to prevent thermal damage and maintain efficiency.`;
                    break;
                case 'REDUCE_LOAD':
                    explanation = `Machine showing signs of stress (temp: ${currentMetrics.temperature}°C, vibration: ${currentMetrics.vibration}mm/s). Reducing load to extend lifespan.`;
                    break;
                case 'SCHEDULE_MAINTENANCE':
                    explanation = `Machine health deteriorating (failure risk: ${(maintenance.failureProbability * 100).toFixed(0)}%). Maintenance required within ${maintenance.recommendedSchedule.daysUntil} days.`;
                    break;
            }

            // Actionable insights
            const actionableInsights: string[] = [];
            if (decision === 'ACTIVATE_COOLING') {
                actionableInsights.push('✓ Activate secondary cooling system');
                actionableInsights.push('✓ Increase ventilation rate');
                actionableInsights.push('✓ Monitor temperature every 5 minutes');
            } else if (decision === 'REDUCE_LOAD') {
                actionableInsights.push('✓ Reduce production speed to 80%');
                actionableInsights.push('✓ Increase break intervals');
                actionableInsights.push('✓ Schedule inspection within 24 hours');
            } else if (decision === 'SCHEDULE_MAINTENANCE') {
                actionableInsights.push(`✓ Book maintenance window within ${maintenance.recommendedSchedule.daysUntil} days`);
                actionableInsights.push(`✓ Estimated downtime: ${maintenance.recommendedSchedule.estimatedDowntime} hours`);
                actionableInsights.push(`✓ Priority: ${maintenance.recommendedSchedule.priority}`);
            }

            // Cost/savings impact
            let costImpact = 0;
            if (decision === 'REDUCE_LOAD') {
                costImpact = -energy.potentialSavings * 0.3; // 30% of savings
            } else if (decision === 'ACTIVATE_COOLING') {
                costImpact = -100; // Rough estimate of cooling cost
            }

            return {
                machineId,
                timestamp: new Date(),
                decision,
                confidence,
                dataPoints: {
                    temperature: currentMetrics.temperature,
                    vibration: currentMetrics.vibration,
                    power: currentMetrics.power,
                    failureProbability: maintenance.failureProbability,
                    anomalyScore: monitoring.abnormalityScore,
                },
                reasoning: {
                    mainFactor,
                    explanation,
                    considerFactors,
                    safetyMargin: Math.round(safetyMargin * 100) / 100,
                },
                actionableInsights,
                estimatedImpact: {
                    energySavings: decision === 'REDUCE_LOAD' ? energy.potentialSavings * 0.3 : 0,
                    riskReduction: decision !== 'CONTINUE' ? monitoring.abnormalityScore * 100 : 0,
                    costImpact,
                },
            };
        } catch (error) {
            console.error('[AI Agent] Decision making error:', error);
            throw error;
        }
    },

    /**
     * 6️⃣ EXPLAINABLE AI (XAI) LAYER
     * Generates executive summaries and human-readable insights
     */
    async generateExplainableReport(machineId: string): Promise<AIAgentReport> {
        try {
            // Gather all intelligence
            const monitoring = await this.monitorMachine(machineId);
            const anomalies = await this.detectAnomalies(machineId);
            const maintenance = await this.predictMaintenance(machineId);
            const energy = await this.optimizeEnergy(machineId);
            const decision = await this.makeAutonomousDecision(machineId);

            // Calculate overall health score (0-100)
            const healthFactors = {
                temperature: Math.max(0, 100 - (monitoring.currentMetrics.temperature * 1.5)),
                vibration: Math.max(0, 100 - (monitoring.currentMetrics.vibration * 15)),
                failureRisk: (1 - maintenance.failureProbability) * 100,
                efficiency: (energy.optimizedEnergy / energy.baselineEnergy) * 100,
                anomalyFree: (1 - monitoring.abnormalityScore) * 100,
            };

            const overallScore = Object.values(healthFactors).reduce((a, b) => a + b, 0) / Object.keys(healthFactors).length;

            // Determine health status
            let healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
            if (overallScore < 50) healthStatus = 'CRITICAL';
            else if (overallScore < 70) healthStatus = 'AT_RISK';

            // Identify key issues
            const keyIssues: string[] = [];
            if (monitoring.state === 'CRITICAL') keyIssues.push('🚨 Machine in CRITICAL state');
            if (anomalies.length > 0) {
                const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
                if (criticalAnomalies.length > 0) {
                    keyIssues.push(`⚠️ ${criticalAnomalies.length} critical anomalies detected`);
                }
            }
            if (maintenance.failureProbability > 0.6) {
                keyIssues.push(`⏰ High failure risk (${(maintenance.failureProbability * 100).toFixed(0)}%) - RUL: ${maintenance.estimatedRUL} days`);
            }
            if (energy.potentialSavings > 500) {
                keyIssues.push(`💰 Significant energy savings potential: $${energy.potentialSavings.toFixed(0)}`);
            }

            // Recommended actions
            const recommendedActions: string[] = [decision.reasoning.explanation];
            decision.actionableInsights.forEach(insight => {
                recommendedActions.push(insight);
            });

            // Calculate estimated ROI
            const estimatedROI = energy.potentialSavings - (maintenance.failureProbability > 0.3 ? maintenance.recommendedSchedule.estimatedCost : 0);

            // Try to get explanation from Gemini (optional enhancement)
            try {
                // This is optional - the AI can work without it
                await geminiService.chat(`Analyze machine ${machineId} health: Temperature ${monitoring.currentMetrics.temperature}°C, Vibration ${monitoring.currentMetrics.vibration}mm/s, Failure risk ${(maintenance.failureProbability * 100).toFixed(0)}%.`);
            } catch (e) {
                // Gemini service may be unavailable, but AI Agent still works
                console.warn('[AI Agent] Gemini insight generation unavailable');
            }

            return {
                machineId,
                machineName: monitoring.machineName,
                reportTimestamp: new Date(),
                monitoring,
                anomalies,
                predictiveMaintenance: maintenance,
                energyOptimization: energy,
                autonomousDecision: decision,
                executiveSummary: {
                    healthStatus,
                    overallScore: Math.round(overallScore * 100) / 100,
                    keyIssues,
                    recommendedActions,
                    estimatedROI: Math.round(estimatedROI * 100) / 100,
                },
            };
        } catch (error) {
            console.error('[AI Agent] Report generation error:', error);
            throw error;
        }
    },

    /**
     * 7️⃣ CONTINUOUS LEARNING SYSTEM
     * Records and learns from past decisions
     */
    async recordDecisionFeedback(
        machineId: string,
        decision: string,
        outcome: string,
        improvement: number
    ): Promise<LearningData> {
        try {
            // Save learning data to database or file
            const learningRecord: LearningData = {
                machineId,
                decision,
                outcome,
                timestamp: new Date(),
                improvement: Math.max(-1, Math.min(1, improvement)),
                feedbackSource: 'HUMAN',
            };

            // In a real system, this would:
            // 1. Store in a learning database
            // 2. Update ML model weights
            // 3. Calculate new decision thresholds
            // 4. Retrain optimization parameters

            console.log('[AI Agent] Learning recorded:', learningRecord);

            return learningRecord;
        } catch (error) {
            console.error('[AI Agent] Learning recording error:', error);
            throw error;
        }
    },

    /**
     * Retrieve learning history for a machine
     */
    async getLearningHistory(machineId: string, limit: number = 50): Promise<LearningData[]> {
        try {
            // In a real system, this would query from learning database
            // For now, returning empty array as we'd need to implement storage

            return [];
        } catch (error) {
            console.error('[AI Agent] Learning history error:', error);
            throw error;
        }
    },

    /**
     * 8️⃣ MULTI-SOURCE DATA FUSION
     * Combines IoT + ERP/MES + optional vision data
     */
    async fuseDataSources(machineId: string): Promise<{
        iotData: any;
        productionData: any;
        fused: any;
    }> {
        try {
            // Get latest IoT readings
            const iotData = await prisma.energyReading.findFirst({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
            });

            if (!iotData) throw new Error('No IoT data available');

            // Get production metrics
            const productionData = await prisma.energyReading.findMany({
                where: { machineId },
                orderBy: { timestamp: 'desc' },
                take: 24, // Last 24 hours
            });

            const avgProduction = productionData.reduce((sum, r) => sum + r.production, 0) / productionData.length;
            const totalRuntime = productionData.reduce((sum, r) => sum + r.runtime, 0);

            // Calculate productivity metrics
            const productionEfficiency = (avgProduction / 100) * 100; // Assuming 100 is max/hour
            const costPerUnit = iotData.power * 0.12 / Math.max(avgProduction, 1); // Rough estimate

            // Fused intelligence
            const fused = {
                machineId,
                timestamp: new Date(),
                operationalMetrics: {
                    ...iotData,
                    productionRate: avgProduction,
                    totalRuntime,
                    productionEfficiency: Math.round(productionEfficiency),
                    costPerUnit: Math.round(costPerUnit * 100) / 100,
                },
                integratedInsights: {
                    energyToProduction: iotData.power / Math.max(avgProduction, 1),
                    utilization: (totalRuntime / 24) * 100, // % of 24-hour period
                    quality: 100 - Math.min(100, iotData.vibration * 5), // Rough quality estimate
                },
            };

            return {
                iotData,
                productionData: {
                    avgProduction,
                    totalRuntime,
                    dataPoints: productionData.length,
                },
                fused,
            };
        } catch (error) {
            console.error('[AI Agent] Data fusion error:', error);
            throw error;
        }
    },

    /**
     * Get comprehensive AI Agent status for all machines
     */
    async getAgentStatus(factoryId?: string): Promise<AIAgentReport[]> {
        try {
            const machines = await prisma.machine.findMany({
                where: factoryId ? { factoryId } : undefined,
            });

            const reports = await Promise.all(
                machines.map(m => this.generateExplainableReport(m.id).catch(err => {
                    console.error(`Error generating report for ${m.id}:`, err);
                    return null;
                }))
            );

            return reports.filter((r): r is AIAgentReport => r !== null);
        } catch (error) {
            console.error('[AI Agent] Status check error:', error);
            throw error;
        }
    },
};
