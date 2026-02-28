import { useEffect, useState } from 'react';
import { rlApi } from '../services/api';
import { TrendingDown, Zap, DollarSign, Target, Loader2, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';

interface RLAnalysis {
    totalMachines: number;
    averageEfficiency: number;
    totalPotentialSavings: number;
    totalMoneySavings: number;
    recommendations: any[];
    topOpportunities: any[];
    learningProgress: number;
}

interface Recommendation {
    title: string;
    description: string;
    impact: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const PRIORITY_COLORS: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700 border-red-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    LOW: 'bg-blue-100 text-blue-700 border-blue-300',
};

export function RLOptimizerPage() {
    const [analysis, setAnalysis] = useState<RLAnalysis | null>(null);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [analysisRes, recsRes] = await Promise.all([
                rlApi.analyze(),
                rlApi.getRecommendations(),
            ]);

            setAnalysis(analysisRes.data);
            setRecommendations(recsRes.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load optimization analysis');
        } finally {
            setLoading(false);
        }
    };

    const generateTrainingData = async () => {
        try {
            setLoading(true);
            await rlApi.generateTrainingData();
            setTimeout(() => loadData(), 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to generate training data');
            setLoading(false);
        }
    };

    if (loading && !analysis) {
        return (
            <div className="animate-fade-in flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="animate-spin text-primary-500" />
                    <p className="text-lg text-text-primary">Analyzing energy patterns...</p>
                    <p className="text-sm text-muted">Running reinforcement learning model</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text-primary">🤖 Reinforcement Learning Optimizer</h1>
                    <p className="text-sm text-muted mt-1">Advanced energy optimization with continuous learning</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="btn-primary disabled:opacity-60"
                >
                    Refresh Analysis
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-500 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700">Error</p>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {analysis && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Daily Savings */}
                        <div className="card border border-border bg-gradient-to-br from-green-50 to-emerald-50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider">Daily Money Savings</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">${analysis.totalMoneySavings.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <DollarSign size={24} className="text-green-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted">
                                Annual: <strong className="text-green-700">${(analysis.totalMoneySavings * 365).toFixed(0)}</strong>
                            </p>
                        </div>

                        {/* Energy Savings */}
                        <div className="card border border-border bg-gradient-to-br from-blue-50 to-cyan-50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider">Daily Energy Savings</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{analysis.totalPotentialSavings.toFixed(1)} kWh</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Zap size={24} className="text-blue-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted">
                                Monthly: <strong className="text-blue-700">{(analysis.totalPotentialSavings * 30).toFixed(0)} kWh</strong>
                            </p>
                        </div>

                        {/* Efficiency */}
                        <div className="card border border-border bg-gradient-to-br from-purple-50 to-pink-50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider">Average Efficiency</p>
                                    <p className="text-3xl font-bold text-purple-600 mt-1">{analysis.averageEfficiency.toFixed(1)}%</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Target size={24} className="text-purple-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted">
                                Improvement: <strong className="text-purple-700">+{(100 - analysis.averageEfficiency).toFixed(1)}%</strong>
                            </p>
                        </div>

                        {/* Learning Progress */}
                        <div className="card border border-border bg-gradient-to-br from-orange-50 to-amber-50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider">Model Learning Progress</p>
                                    <p className="text-3xl font-bold text-orange-600 mt-1">{analysis.learningProgress}%</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Lightbulb size={24} className="text-orange-600" />
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-orange-600 h-2 rounded-full transition-all"
                                    style={{ width: `${analysis.learningProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Top Opportunities */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                <TrendingDown size={20} /> Top Energy-Saving Opportunities
                            </h2>
                            <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                                {analysis.topOpportunities.length} opportunities
                            </span>
                        </div>

                        <div className="space-y-3">
                            {analysis.topOpportunities.length > 0 ? (
                                analysis.topOpportunities.map((opp: any, idx: number) => (
                                    <div key={idx} className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-transparent">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-text-primary">{opp.machineName}</h3>
                                                <p className="text-sm text-muted mt-1">{opp.recommendation}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-600">${opp.moneySavings.toFixed(2)}</p>
                                                <p className="text-xs text-muted mt-1">/day potential</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-xs mt-4 pt-4 border-t border-gray-200">
                                            <div>
                                                <p className="text-muted mb-1">Current Power</p>
                                                <p className="font-semibold text-text-primary">{opp.currentPowerUsage.toFixed(2)} kW</p>
                                            </div>
                                            <div>
                                                <p className="text-muted mb-1">Optimal Power</p>
                                                <p className="font-semibold text-green-600">{opp.optimalPowerUsage.toFixed(2)} kW</p>
                                            </div>
                                            <div>
                                                <p className="text-muted mb-1">Confidence</p>
                                                <p className="font-semibold text-text-primary">{(opp.confidence * 100).toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="card text-center py-8 text-muted">
                                    <p>No optimization opportunities detected. Machines are already optimized!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strategic Recommendations */}
                    {recommendations && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                💡 Strategic Energy-Saving Recommendations
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendations.recommendations.map((rec: Recommendation, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`card border-2 ${PRIORITY_COLORS[rec.priority]}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-text-primary">{rec.title}</h3>
                                            {rec.priority === 'HIGH' && <span className="text-xs font-bold px-2 py-1 bg-red-200 rounded">URGENT</span>}
                                        </div>
                                        <p className="text-sm text-text-secondary mb-3">{rec.description}</p>
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <CheckCircle size={16} />
                                            {rec.impact}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {recommendations.projectedAnnualSavings && (
                                <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200">
                                    <div className="flex items-center gap-3">
                                        <DollarSign size={32} className="text-primary-600" />
                                        <div>
                                            <p className="text-sm text-primary-700">Projected Annual Savings</p>
                                            <p className="text-3xl font-bold text-primary-600">
                                                ${recommendations.projectedAnnualSavings.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-primary-600 mt-1">
                                                Based on current energy patterns and optimization recommendations
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* All Machine Recommendations */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-text-primary">All Machine Optimization Details</h2>
                        <div className="space-y-3">
                            {analysis.recommendations.map((rec: any, idx: number) => (
                                <div key={idx} className="card border border-border hover:shadow-card-hover transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{rec.machineName}</h3>
                                            <p className="text-sm text-muted mt-0.5">{rec.recommendation}</p>
                                        </div>
                                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                            {rec.actionTaken}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-border">
                                        <div>
                                            <p className="text-muted">Current</p>
                                            <p className="font-bold text-text-primary">{rec.currentPowerUsage.toFixed(2)} kW</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Optimal</p>
                                            <p className="font-bold text-green-600">{rec.optimalPowerUsage.toFixed(2)} kW</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Daily Saving</p>
                                            <p className="font-bold text-green-600">${rec.moneySavings.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Confidence</p>
                                            <p className="font-bold text-text-primary">{(rec.confidence * 100).toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Admin Section */}
                    <div className="card border border-border bg-gradient-to-r from-blue-50 to-cyan-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-text-primary">Generate RL Training Data</h3>
                                <p className="text-sm text-muted mt-1">Create synthetic training patterns to improve model learning</p>
                            </div>
                            <button
                                onClick={generateTrainingData}
                                disabled={loading}
                                className="btn-primary disabled:opacity-60"
                            >
                                {loading ? 'Generating...' : 'Generate Data'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
