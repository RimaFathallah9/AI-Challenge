import React, { useState, useEffect } from 'react';
import {
    Activity,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Zap,
    Thermometer,
    Waves,
    Clock,
    Play,
    RefreshCw,
    ChevronRight,
    DollarSign,
} from 'lucide-react';
import { digitalTwinApi } from '../services/api';

interface Machine {
    id: string;
    name: string;
    type: string;
}

interface DigitalTwinState {
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
    remainingUsefulLife?: {
        hours: number;
        days: number;
        confidence: number;
    };
}

interface SimulationResult {
    scenario: string;
    duration: number;
    projectedPower: number;
    projectedTemp: number;
    projectedVibration: number;
    failureProbability: number;
    lifespan: number;
    recommendation: string;
}

interface ScenarioComparison {
    [key: string]: {
        scenario: string;
        failureProbability: number;
        lifespan: number;
        projectedTemp: number;
        projectedPower: number;
    };
}

export function DigitalTwinPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [twinState, setTwinState] = useState<DigitalTwinState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [simulatingScenario, setSimulatingScenario] = useState<string | null>(null);
    const [scenarioFilter, setScenarioFilter] = useState<'all' | 'safe' | 'risky'>('all');
    
    // Production Simulation State
    const [showProductionForm, setShowProductionForm] = useState(false);
    const [productionLoading, setProductionLoading] = useState(false);
    const [productionResult, setProductionResult] = useState<any>(null);
    const [productionForm, setProductionForm] = useState({
        operationHours: 24,
        targetProduction: 1000,
        materialType: 'steel',
        materialQuantity: 500,
    });

    // Load machines on mount
    useEffect(() => {
        loadMachines();
    }, []);

    // Load machine state when selected
    useEffect(() => {
        if (selectedMachineId) {
            loadMachineState();
        }
    }, [selectedMachineId]);

    const loadMachines = async () => {
        try {
            setLoading(true);
            const response = await digitalTwinApi.getAllMachines();
            if (response.data?.machines) {
                setMachines(response.data.machines.map((m: any) => ({ id: m.id, name: m.name, type: m.type })));
                if (response.data.machines.length > 0) {
                    setSelectedMachineId(response.data.machines[0].id);
                }
            }
        } catch (err: any) {
            setError('Failed to load machines');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMachineState = async () => {
        if (!selectedMachineId) return;
        try {
            setLoading(true);
            const response = await digitalTwinApi.getMachineState(selectedMachineId);
            setTwinState(response.data);
            setError(null);
        } catch (err: any) {
            setError('Failed to load machine state');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulateScenario = async (scenario: string) => {
        if (!selectedMachineId || !twinState) return;
        try {
            setSimulatingScenario(scenario);
            await digitalTwinApi.simulateScenario(selectedMachineId, scenario, 100);
            await loadMachineState();
        } catch (err: any) {
            setError('Simulation failed');
            console.error(err);
        } finally {
            setSimulatingScenario(null);
        }
    };

    const handleSimulateProduction = async () => {
        if (!selectedMachineId) return;
        try {
            setProductionLoading(true);
            const response = await digitalTwinApi.simulateProduction(selectedMachineId, {
                operationHours: productionForm.operationHours,
                targetProduction: productionForm.targetProduction,
                materialType: productionForm.materialType,
                materialQuantity: productionForm.materialQuantity,
            });
            setProductionResult(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Production simulation failed');
            console.error(err);
        } finally {
            setProductionLoading(false);
        }
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'HEALTHY':
                return 'text-green-600 bg-green-50';
            case 'WARNING':
                return 'text-amber-600 bg-amber-50';
            case 'CRITICAL':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getScenarioColor = (failureProb: number) => {
        if (failureProb > 0.7) return 'text-red-600';
        if (failureProb > 0.4) return 'text-amber-600';
        return 'text-green-600';
    };

    const filteredScenarios = twinState?.simulationResults.filter((s) => {
        if (scenarioFilter === 'safe') return s.failureProbability < 0.4;
        if (scenarioFilter === 'risky') return s.failureProbability > 0.7;
        return true;
    }) || [];

    if (loading && !twinState) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <Activity className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                    <p className="mt-4 text-gray-600">Loading Digital Twin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Virtual Digital Twin</h1>
                <p className="text-gray-600">Predict failures, test scenarios, and optimize machine health with AI-powered digital twin simulation</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Error</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-12 gap-6">
                {/* Machine Selector */}
                <div className="col-span-12 md:col-span-3">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5" /> Machines
                        </h2>
                        <div className="space-y-2">
                            {machines.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMachineId(m.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                                        selectedMachineId === m.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                    }`}
                                >
                                    <div className="font-semibold text-sm">{m.name}</div>
                                    <div className={`text-xs ${selectedMachineId === m.id ? 'text-blue-100' : 'text-gray-600'}`}>
                                        {m.type}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={loadMachines}
                            className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-12 md:col-span-9 space-y-6">
                    {twinState && (
                        <>
                            {/* Current State Overview */}
                            <div className="bg-white rounded-lg shadow-md p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{twinState.machineName}</h2>
                                        <p className="text-gray-600 text-sm">{twinState.machineType}</p>
                                    </div>
                                    <div
                                        className={`px-4 py-2 rounded-full font-semibold text-sm ${getRiskColor(
                                            twinState.predictedFailure.riskLevel
                                        )}`}
                                    >
                                        {twinState.predictedFailure.riskLevel}
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { icon: Zap, label: 'Power', value: `${twinState.currentPower.toFixed(1)} kW`, color: 'text-yellow-600' },
                                        {
                                            icon: Thermometer,
                                            label: 'Temperature',
                                            value: `${twinState.currentTemp.toFixed(1)}°C`,
                                            color: 'text-red-600',
                                        },
                                        {
                                            icon: Waves,
                                            label: 'Vibration',
                                            value: `${twinState.currentVibration.toFixed(2)} mm/s`,
                                            color: 'text-purple-600',
                                        },
                                        { icon: Clock, label: 'Runtime', value: `${twinState.currentRuntime.toFixed(1)} h`, color: 'text-blue-600' },
                                    ].map((metric, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                            <div className={`${metric.color} mb-2`}>
                                                <metric.icon className="w-6 h-6" />
                                            </div>
                                            <div className="text-xs text-gray-600 mb-1">{metric.label}</div>
                                            <div className="font-bold text-gray-900">{metric.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Failure Prediction & RUL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Failure Prediction Card */}
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" /> Failure Prediction
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Failure Probability</span>
                                                <span className="font-bold text-lg text-gray-900">
                                                    {(twinState.predictedFailure.probability * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        twinState.predictedFailure.probability > 0.7
                                                            ? 'bg-red-600'
                                                            : twinState.predictedFailure.probability > 0.4
                                                            ? 'bg-amber-600'
                                                            : 'bg-green-600'
                                                    }`}
                                                    style={{ width: `${twinState.predictedFailure.probability * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-xs text-gray-600 mb-1">Expected Failure Type</div>
                                            <div className="font-semibold text-gray-900">{twinState.predictedFailure.failureType}</div>
                                        </div>
                                        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded p-3 border border-red-200">
                                            <div className="text-xs text-gray-600 mb-1">Estimated Days Until Failure</div>
                                            <div className="text-2xl font-bold text-red-600">{twinState.predictedFailure.daysUntilFailure}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* RUL Card */}
                                {twinState.remainingUsefulLife && (
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <TrendingDown className="w-5 h-5" /> Remaining Useful Life (RUL)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded p-4 border border-blue-200">
                                                <div className="text-xs text-gray-600 mb-1">RUL Hours</div>
                                                <div className="text-3xl font-bold text-blue-600">
                                                    {twinState.remainingUsefulLife.hours.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    ≈ {twinState.remainingUsefulLife.days.toFixed(1)} days
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded p-3">
                                                <div className="text-xs text-gray-600 mb-1">Confidence Level</div>
                                                <div className="text-lg font-bold text-gray-900">
                                                    {(twinState.remainingUsefulLife.confidence * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" /> Recommendations
                                </h3>
                                <div className="space-y-3">
                                    {twinState.recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex gap-3 items-start bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scenario Simulation */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Play className="w-5 h-5" /> Scenario Testing & Prediction
                                </h3>

                                {/* Scenario Filter */}
                                <div className="flex gap-2 mb-6">
                                    {(['all', 'safe', 'risky'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setScenarioFilter(filter)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                scenarioFilter === filter
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {filter === 'all' ? 'All Scenarios' : filter === 'safe' ? '✓ Safe' : '⚠️ Risky'}
                                        </button>
                                    ))}
                                </div>

                                {/* Scenario Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredScenarios.map((sim) => (
                                        <div
                                            key={sim.scenario}
                                            className={`border-2 rounded-lg p-6 transition-all ${
                                                sim.failureProbability > 0.7
                                                    ? 'border-red-300 bg-red-50'
                                                    : sim.failureProbability > 0.4
                                                    ? 'border-amber-300 bg-amber-50'
                                                    : 'border-green-300 bg-green-50'
                                            }`}
                                        >
                                            <h4 className="font-semibold text-gray-900 mb-3">{sim.scenario}</h4>
                                            <div className="space-y-2 text-sm mb-4">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Duration</span>
                                                    <span className="font-semibold text-gray-900">{sim.duration} hours</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Projected Power</span>
                                                    <span className="font-semibold text-gray-900">{sim.projectedPower.toFixed(1)} kW</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Projected Temp</span>
                                                    <span className="font-semibold text-gray-900">{sim.projectedTemp.toFixed(1)}°C</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Failure Risk</span>
                                                    <span className={`font-bold ${getScenarioColor(sim.failureProbability)}`}>
                                                        {(sim.failureProbability * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Est. Lifespan</span>
                                                    <span className="font-semibold text-gray-900">{sim.lifespan} hours</span>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded p-3 mb-4">
                                                <p className="text-xs text-gray-700">{sim.recommendation}</p>
                                            </div>
                                            <button
                                                onClick={() => handleSimulateScenario(sim.scenario)}
                                                disabled={simulatingScenario === sim.scenario}
                                                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    simulatingScenario === sim.scenario
                                                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                {simulatingScenario === sim.scenario ? 'Simulating...' : 'Run Simulation'}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {filteredScenarios.length === 0 && (
                                    <div className="text-center py-8 text-gray-600">
                                        <p>No scenarios match the selected filter.</p>
                                    </div>
                                )}
                            </div>

                            {/* Production Simulation & Cost Optimization */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <button
                                    onClick={() => setShowProductionForm(!showProductionForm)}
                                    className="w-full flex items-center justify-between mb-4 hover:bg-gray-50 py-2 px-2 rounded-lg transition-colors"
                                >
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" /> Production Cost Optimization
                                    </h3>
                                    <span className="text-gray-500">{showProductionForm ? '▼' : '▶'}</span>
                                </button>

                                {showProductionForm && (
                                    <>
                                        {!productionResult ? (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600">Enter production parameters to analyze energy consumption and identify cost-saving opportunities:</p>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Operation Hours</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="8760"
                                                            value={productionForm.operationHours}
                                                            onChange={(e) => setProductionForm({ ...productionForm, operationHours: parseInt(e.target.value) || 1 })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="24"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">1-8760 hours per year</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Production</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="100000"
                                                            value={productionForm.targetProduction}
                                                            onChange={(e) => setProductionForm({ ...productionForm, targetProduction: parseInt(e.target.value) || 1000 })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="1000"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">Units to produce</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
                                                        <select
                                                            value={productionForm.materialType}
                                                            onChange={(e) => setProductionForm({ ...productionForm, materialType: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="steel">Steel</option>
                                                            <option value="aluminum">Aluminum</option>
                                                            <option value="plastic">Plastic</option>
                                                            <option value="copper">Copper</option>
                                                            <option value="composite">Composite</option>
                                                            <option value="generic">Generic</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Material Quantity</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.5"
                                                            value={productionForm.materialQuantity}
                                                            onChange={(e) => setProductionForm({ ...productionForm, materialQuantity: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="500"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">kg</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleSimulateProduction()}
                                                    disabled={productionLoading}
                                                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                                        productionLoading
                                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                                >
                                                    {productionLoading ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Analyzing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="w-4 h-4" /> Run Cost Analysis
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Results Header */}
                                                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs text-gray-600">Operation Time</p>
                                                            <p className="text-lg font-semibold text-gray-900">{productionResult.scenario.operationHours} hours</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600">Target Production</p>
                                                            <p className="text-lg font-semibold text-gray-900">{productionResult.scenario.targetProduction} units</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600">Material Used</p>
                                                            <p className="text-lg font-semibold text-gray-900">{productionResult.scenario.materialUsed} kg {productionResult.scenario.materialType}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600">Confidence Score</p>
                                                            <p className="text-lg font-semibold text-green-600">{Math.round(productionResult.confidenceScore * 100)}%</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Baseline vs Optimized Metrics */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Baseline vs Optimized Operation</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                            <p className="text-xs text-gray-600">Energy Consumption</p>
                                                            <p className="text-sm font-semibold text-gray-900">{productionResult.baselineMetrics.totalEnergyConsumption.toFixed(1)} kWh</p>
                                                            <p className="text-xs text-blue-600 mt-1">Baseline</p>
                                                        </div>
                                                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                                            <p className="text-xs text-gray-600">Optimized Energy</p>
                                                            <p className="text-sm font-semibold text-gray-900">{productionResult.optimizedMetrics.totalEnergyConsumption.toFixed(1)} kWh</p>
                                                            <p className="text-xs text-green-600 mt-1">Optimized</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-emerald-300">
                                                            <p className="text-xs text-gray-600">Energy Savings</p>
                                                            <p className="text-sm font-semibold text-green-700">{productionResult.savings.energySavings.toFixed(1)} kWh</p>
                                                            <p className="text-xs text-emerald-600 mt-1">{productionResult.savings.percentageSavings.toFixed(1)}%</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cost Breakdown */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Cost Analysis</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                                            <p className="text-xs text-gray-600">Baseline Cost</p>
                                                            <p className="text-sm font-semibold text-gray-900">${productionResult.baselineMetrics.totalCost.toFixed(2)}</p>
                                                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                                                                <p>Energy: ${productionResult.baselineMetrics.energyCost.toFixed(2)}</p>
                                                                <p>Material: ${productionResult.baselineMetrics.materialCost.toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                                            <p className="text-xs text-gray-600">Optimized Cost</p>
                                                            <p className="text-sm font-semibold text-gray-900">${productionResult.optimizedMetrics.totalCost.toFixed(2)}</p>
                                                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                                                                <p>Energy: ${productionResult.optimizedMetrics.energyCost.toFixed(2)}</p>
                                                                <p>Material: ${productionResult.optimizedMetrics.materialCost.toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-3 border border-green-400">
                                                            <p className="text-xs font-semibold text-green-900">Total Savings</p>
                                                            <p className="text-lg font-bold text-green-700">${productionResult.savings.moneySavings.toFixed(2)}</p>
                                                            <p className="text-xs text-green-600 mt-1">Save this month</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Waste & Environmental Impact */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Environmental Impact</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                                            <p className="text-xs text-gray-600">Baseline Waste</p>
                                                            <p className="text-sm font-semibold text-gray-900">{productionResult.baselineMetrics.materialWaste.toFixed(2)} kg</p>
                                                            <p className="text-xs text-red-600 mt-1">Current</p>
                                                        </div>
                                                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                                            <p className="text-xs text-gray-600">Optimized Waste</p>
                                                            <p className="text-sm font-semibold text-gray-900">{productionResult.optimizedMetrics.materialWaste.toFixed(2)} kg</p>
                                                            <p className="text-xs text-orange-600 mt-1">With optimization</p>
                                                        </div>
                                                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-300">
                                                            <p className="text-xs text-gray-600">Waste Reduction</p>
                                                            <p className="text-sm font-semibold text-emerald-700">{productionResult.savings.wasteReduction.toFixed(2)} kg</p>
                                                            <p className="text-xs text-emerald-600 mt-1">{((productionResult.savings.wasteReduction / productionResult.baselineMetrics.materialWaste) * 100).toFixed(1)}%</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Risk Assessment */}
                                                {productionResult.riskAssessment && (
                                                    <div className={`rounded-lg p-4 ${
                                                        productionResult.riskAssessment.qualityImpact === 'HIGH' ? 'bg-red-50 border border-red-200' :
                                                        productionResult.riskAssessment.qualityImpact === 'MEDIUM' ? 'bg-amber-50 border border-amber-200' :
                                                        'bg-green-50 border border-green-200'
                                                    }`}>
                                                        <h4 className="font-semibold text-gray-900 mb-2">Risk Assessment</h4>
                                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                                            <div>
                                                                <p className="text-xs text-gray-600">Failure Probability</p>
                                                                <p className="text-sm font-semibold text-gray-900">{(productionResult.riskAssessment.failureProbability * 100).toFixed(1)}%</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-600">Quality Impact</p>
                                                                <p className={`text-sm font-semibold ${
                                                                    productionResult.riskAssessment.qualityImpact === 'HIGH' ? 'text-red-600' :
                                                                    productionResult.riskAssessment.qualityImpact === 'MEDIUM' ? 'text-amber-600' :
                                                                    'text-green-600'
                                                                }`}>
                                                                    {productionResult.riskAssessment.qualityImpact}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-600">Status</p>
                                                                <p className="text-sm font-semibold text-gray-900">{productionResult.riskAssessment.qualityImpact === 'LOW' ? '✓ Healthy' : productionResult.riskAssessment.qualityImpact === 'MEDIUM' ? '⚠ Monitor' : '✗ Critical'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{productionResult.riskAssessment.recommendation}</p>
                                                    </div>
                                                )}

                                                {/* Recommendations */}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3">Optimization Recommendations</h4>
                                                    <div className="space-y-3">
                                                        {productionResult.recommendations.map((rec: any, idx: number) => (
                                                            <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <h5 className="font-semibold text-gray-900">{idx + 1}. {rec.title}</h5>
                                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                                        rec.difficulty === 'Low' ? 'bg-green-100 text-green-700' :
                                                                        rec.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {rec.difficulty}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div className="bg-white rounded p-2">
                                                                        <p className="text-gray-600">Est. Savings</p>
                                                                        <p className="font-semibold text-green-600">${rec.estimatedSavings.toFixed(2)}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded p-2">
                                                                        <p className="text-gray-600">Implementation</p>
                                                                        <p className="font-semibold text-gray-900">{rec.implementationTime}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded p-2">
                                                                        <p className="text-gray-600">Impact</p>
                                                                        <p className="font-semibold text-blue-600">{rec.impact}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setProductionResult(null)}
                                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                                    >
                                                        Run Another Analysis
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const text = `Production Cost Analysis\n\nOperation: ${productionResult.scenario.operationHours}h, ${productionResult.scenario.targetProduction} units\nMaterial: ${productionResult.scenario.materialUsed}kg ${productionResult.scenario.materialType}\n\nBaseline Cost: $${productionResult.baselineMetrics.totalCost.toFixed(2)}\nOptimized Cost: $${productionResult.optimizedMetrics.totalCost.toFixed(2)}\nTotal Savings: $${productionResult.savings.moneySavings.toFixed(2)}\n\nRecommendations:\n${productionResult.recommendations.map((r: any, i: number) => `${i+1}. ${r.title} - $${r.estimatedSavings.toFixed(2)}`).join('\n')}`;
                                                            navigator.clipboard.writeText(text);
                                                            alert('Results copied to clipboard!');
                                                        }}
                                                        className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Copy Results
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
