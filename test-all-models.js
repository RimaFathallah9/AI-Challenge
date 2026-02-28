#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE AI MODEL VALIDATION TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * Tests all 8 AI features with valid/invalid inputs and new dataset
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test data
const testMachines = [
    'machine-pump-001',
    'machine-motor-001',
    'machine-compressor-001',
    'machine-conveyor-001',
    'machine-cnc-001',
];

const materialTypes = ['steel', 'aluminum', 'plastic', 'copper', 'composite'];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    details: [],
};

function logTest(name, passed, details) {
    results.totalTests++;
    if (passed) {
        results.passedTests++;
        console.log(`  ✅ ${name}`);
    } else {
        results.failedTests++;
        console.log(`  ❌ ${name}`);
    }
    if (details) {
        results.details.push({ name, passed, details });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: PRODUCTION SIMULATION WITH VALID INPUTS
// ─────────────────────────────────────────────────────────────────────────────

async function testValidProductionSimulation() {
    console.log('\n📊 SUITE 1: Production Simulation - VALID INPUTS');
    console.log('─'.repeat(70));

    const testCases = [
        {
            name: 'Pump - 8 hours, 500 units',
            machineId: 'machine-pump-001',
            operationHours: 8,
            targetProduction: 500,
            materialType: 'steel',
        },
        {
            name: 'Motor - 16 hours, 1200 units',
            machineId: 'machine-motor-001',
            operationHours: 16,
            targetProduction: 1200,
            materialType: 'aluminum',
        },
        {
            name: 'Compressor - 24 hours, 2000 units',
            machineId: 'machine-compressor-001',
            operationHours: 24,
            targetProduction: 2000,
            materialType: 'composite',
        },
        {
            name: 'Conveyor - 4 hours, 200 units',
            machineId: 'machine-conveyor-001',
            operationHours: 4,
            targetProduction: 200,
            materialType: 'plastic',
        },
    ];

    for (const test of testCases) {
        try {
            const response = await makeRequest('POST', '/api/energy/simulate-production', {
                machineId: test.machineId,
                operationHours: test.operationHours,
                targetProduction: test.targetProduction,
                materialType: test.materialType,
            });

            if (response.status === 200 && response.body.machineId) {
                // Validate response structure
                const hasBaseline = response.body.baselineMetrics && response.body.baselineMetrics.totalCost > 0;
                const hasOptimized = response.body.optimizedMetrics && response.body.optimizedMetrics.totalCost > 0;
                const hasSavings = response.body.savings && response.body.savings.moneySavings >= 0;

                logTest(
                    test.name,
                    hasBaseline && hasOptimized && hasSavings,
                    {
                        baseline: `$${response.body.baselineMetrics.totalCost}`,
                        optimized: `$${response.body.optimizedMetrics.totalCost}`,
                        savings: `$${response.body.savings.moneySavings}`,
                    }
                );
            } else {
                logTest(test.name, false, { error: response.body });
            }
        } catch (error) {
            logTest(test.name, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: PRODUCTION SIMULATION WITH INVALID INPUTS
// ─────────────────────────────────────────────────────────────────────────────

async function testInvalidProductionSimulation() {
    console.log('\n🚨 SUITE 2: Production Simulation - INVALID INPUTS (Should Reject)');
    console.log('─'.repeat(70));

    const testCases = [
        {
            name: 'Zero operation hours',
            machineId: 'machine-pump-001',
            operationHours: 0,
            targetProduction: 500,
        },
        {
            name: 'Negative operation hours',
            machineId: 'machine-pump-001',
            operationHours: -100,
            targetProduction: 500,
        },
        {
            name: 'Excessive operation hours (999,999)',
            machineId: 'machine-pump-001',
            operationHours: 999999,
            targetProduction: 500,
        },
        {
            name: 'Zero target production',
            machineId: 'machine-motor-001',
            operationHours: 8,
            targetProduction: 0,
        },
        {
            name: 'Negative target production',
            machineId: 'machine-motor-001',
            operationHours: 8,
            targetProduction: -1000,
        },
        {
            name: 'Excessive target production (1M units)',
            machineId: 'machine-compressor-001',
            operationHours: 8,
            targetProduction: 1000000,
        },
        {
            name: 'Non-existent machine',
            machineId: 'machine-invalid-999',
            operationHours: 8,
            targetProduction: 500,
        },
    ];

    for (const test of testCases) {
        try {
            const response = await makeRequest('POST', '/api/energy/simulate-production', {
                machineId: test.machineId,
                operationHours: test.operationHours,
                targetProduction: test.targetProduction,
            });

            const shouldReject = response.status !== 200 || response.body.error;
            logTest(
                test.name,
                shouldReject,
                { status: response.status, error: response.body.error || response.body.message }
            );
        } catch (error) {
            logTest(test.name, true, { rejected: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: AI AGENT - REAL-TIME MONITORING
// ─────────────────────────────────────────────────────────────────────────────

async function testRealTimeMonitoring() {
    console.log('\n🔍 SUITE 3: AI Agent - Real-Time Monitoring');
    console.log('─'.repeat(70));

    for (const machineId of testMachines) {
        try {
            const response = await makeRequest('GET', `/api/ai-agent/monitor/${machineId}`);

            if (response.status === 200 && response.body.machineId) {
                const hasState = response.body.currentState && ['NORMAL', 'WARNING', 'CRITICAL'].includes(response.body.currentState);
                const hasAbnormality = typeof response.body.abnormalityScore === 'number';

                logTest(
                    `Monitoring: ${machineId}`,
                    hasState && hasAbnormality,
                    { state: response.body.currentState, abnormality: response.body.abnormalityScore }
                );
            } else {
                logTest(`Monitoring: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`Monitoring: ${machineId}`, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: AI AGENT - ANOMALY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

async function testAnomalyDetection() {
    console.log('\n📉 SUITE 4: AI Agent - Anomaly Detection');
    console.log('─'.repeat(70));

    for (const machineId of testMachines.slice(0, 2)) {
        try {
            const response = await makeRequest('GET', `/api/ai-agent/detect-anomalies/${machineId}`);

            if (response.status === 200 && response.body.machineId) {
                const hasAnomalies = Array.isArray(response.body.detectedAnomalies);
                const hasScore = typeof response.body.anomalyScore === 'number';

                logTest(
                    `Anomaly Detection: ${machineId}`,
                    hasAnomalies && hasScore,
                    { detected: response.body.detectedAnomalies.length, score: response.body.anomalyScore }
                );
            } else {
                logTest(`Anomaly Detection: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`Anomaly Detection: ${machineId}`, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: AI AGENT - PREDICTIVE MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────

async function testPredictiveMaintenance() {
    console.log('\n🔧 SUITE 5: AI Agent - Predictive Maintenance');
    console.log('─'.repeat(70));

    for (const machineId of testMachines.slice(0, 2)) {
        try {
            const response = await makeRequest('GET', `/api/ai-agent/predict-maintenance/${machineId}`);

            if (response.status === 200 && response.body.machineId) {
                const hasRUL = typeof response.body.remainingUsefulLife === 'number';
                const hasFailureProb = typeof response.body.failureProbability === 'number';
                const hasRecommendation = response.body.recommendation && response.body.recommendation.length > 0;

                logTest(
                    `Maintenance: ${machineId}`,
                    hasRUL && hasFailureProb && hasRecommendation,
                    {
                        RUL: `${response.body.remainingUsefulLife} days`,
                        failureProb: `${(response.body.failureProbability * 100).toFixed(1)}%`,
                    }
                );
            } else {
                logTest(`Maintenance: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`Maintenance: ${machineId}`, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: AI AGENT - ENERGY OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────────────

async function testEnergyOptimization() {
    console.log('\n⚡ SUITE 6: AI Agent - Energy Optimization');
    console.log('─'.repeat(70));

    for (const machineId of testMachines.slice(0, 2)) {
        try {
            const response = await makeRequest('POST', '/api/ai-agent/optimize-energy', {
                machineId,
                operationHours: 8,
                targetProduction: 500,
            });

            if (response.status === 200 && response.body.recommendations) {
                const hasRecommendations = Array.isArray(response.body.recommendations) && response.body.recommendations.length > 0;
                const hasEnergyImpact = typeof response.body.energySavingsPotential === 'number';

                logTest(
                    `Energy Optimization: ${machineId}`,
                    hasRecommendations && hasEnergyImpact,
                    {
                        recommendations: response.body.recommendations.length,
                        savingsPotential: `${response.body.energySavingsPotential.toFixed(1)} kWh`,
                    }
                );
            } else {
                logTest(`Energy Optimization: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`Energy Optimization: ${machineId}`, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: AI AGENT - AUTONOMOUS DECISION
// ─────────────────────────────────────────────────────────────────────────────

async function testAutonomousDecision() {
    console.log('\n🤖 SUITE 7: AI Agent - Autonomous Decision Making');
    console.log('─'.repeat(70));

    for (const machineId of testMachines.slice(0, 1)) {
        try {
            const response = await makeRequest('POST', '/api/ai-agent/autonomous-decision', {
                machineId,
                currentState: 'WARNING',
                temperature: 78,
                vibration: 3.2,
                power: 20,
            });

            if (response.status === 200 && response.body.decision) {
                const validDecisions = ['CONTINUE', 'REDUCE_LOAD', 'ACTIVATE_COOLING', 'SCHEDULE_MAINTENANCE'];
                const isDecisionValid = validDecisions.includes(response.body.decision);

                logTest(
                    `Autonomous Decision: ${machineId}`,
                    isDecisionValid,
                    { decision: response.body.decision, confidence: response.body.confidence }
                );
            } else {
                logTest(`Autonomous Decision: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`Autonomous Decision: ${machineId}`, false, { error: error.message });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: AI AGENT - XAI REPORT
// ─────────────────────────────────────────────────────────────────────────────

async function testXAIReport() {
    console.log('\n📊 SUITE 8: AI Agent - Explainable AI Report');
    console.log('─'.repeat(70));

    for (const machineId of testMachines.slice(0, 1)) {
        try {
            const response = await makeRequest('GET', `/api/ai-agent/xai-report/${machineId}`);

            if (response.status === 200 && response.body.machineId) {
                const hasHealthScore = typeof response.body.healthScore === 'number' && response.body.healthScore >= 0 && response.body.healthScore <= 100;
                const hasExplanation = response.body.explanation && response.body.explanation.length > 0;
                const hasRecommendations = Array.isArray(response.body.recommendations);

                logTest(
                    `XAI Report: ${machineId}`,
                    hasHealthScore && hasExplanation && hasRecommendations,
                    {
                        healthScore: response.body.healthScore,
                        recommendations: response.body.recommendations.length,
                    }
                );
            } else {
                logTest(`XAI Report: ${machineId}`, false, { error: response.body });
            }
        } catch (error) {
            logTest(`XAI Report: ${machineId}`, false, { error: error.message });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 COMPREHENSIVE AI MODEL VALIDATION TEST SUITE');
    console.log('═'.repeat(70));
    
    try {
        await testValidProductionSimulation();
        await testInvalidProductionSimulation();
        await testRealTimeMonitoring();
        await testAnomalyDetection();
        await testPredictiveMaintenance();
        await testEnergyOptimization();
        await testAutonomousDecision();
        await testXAIReport();

        // ───────────────────────────────────────────────────────
        // SUMMARY REPORT
        // ───────────────────────────────────────────────────────
        console.log('\n' + '═'.repeat(70));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('═'.repeat(70));

        const percentage = ((results.passedTests / results.totalTests) * 100).toFixed(1);
        console.log(`\n  Total Tests: ${results.totalTests}`);
        console.log(`  ✅ Passed: ${results.passedTests}`);
        console.log(`  ❌ Failed: ${results.failedTests}`);
        console.log(`  📈 Success Rate: ${percentage}%\n`);

        if (results.failedTests === 0) {
            console.log('🎉 ALL TESTS PASSED! Models are working correctly with the new dataset!\n');
        } else {
            console.log('⚠️ Some tests failed. Review details above.\n');
        }
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

runAllTests();
