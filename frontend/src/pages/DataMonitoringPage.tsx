import { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/dashboard.store';
import { useWebSocket } from '../hooks/useWebSocket';
import { MachineStatus, IoTReading } from '../types';
import { Cpu, Thermometer, Zap, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_COLOR: Record<MachineStatus, string> = {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-gray-400',
    MAINTENANCE: 'bg-yellow-400',
    WARNING: 'bg-orange-400',
    CRITICAL: 'bg-red-500',
};

export function DataMonitoringPage() {
    const { liveReadings } = useDashboardStore();
    useWebSocket();

    // Track historical data for charts (keep last 100 readings per machine)
    const [readingHistory, setReadingHistory] = useState<Record<string, Array<IoTReading & { index: number }>>>({});
    const [chartKey, setChartKey] = useState(0);

    useEffect(() => {
        if (liveReadings.length === 0) return;

        // Update history with new readings
        setReadingHistory((prev) => {
            const updated = { ...prev };
            for (const reading of liveReadings) {
                if (!updated[reading.machineId]) {
                    updated[reading.machineId] = [];
                }
                // Add new reading with index for chart x-axis
                const index = updated[reading.machineId].length + 1;
                updated[reading.machineId].push({
                    ...reading,
                    index: index,
                });

                // Keep only last 100 readings for memory efficiency
                if (updated[reading.machineId].length > 100) {
                    updated[reading.machineId] = updated[reading.machineId].slice(-100);
                }
            }
            return updated;
        });

        // Force chart re-render
        setChartKey((k) => k + 1);
    }, [liveReadings]);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-bold text-text-primary">Data Monitoring & Visualization</h1>
                <div className="flex items-center gap-2 text-sm text-muted">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live — updates every 2s | {Object.values(readingHistory).reduce((sum, arr) => sum + arr.length, 0)} total readings
                </div>
            </div>

            {liveReadings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted">
                    <Cpu size={48} className="mb-4 opacity-40" />
                    <p className="text-lg font-medium">Waiting for sensor data...</p>
                    <p className="text-sm mt-1">Ensure the backend is running and machines are configured.</p>
                </div>
            ) : (
                <>
                    {/* Real-Time Charts */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <TrendingUp size={18} /> Real-Time Trends
                        </h2>
                        
                        {liveReadings.length > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {/* Power Consumption Chart */}
                                <div className="card border border-border">
                                    <h3 className="font-semibold text-text-primary mb-4">Power Consumption (kW)</h3>
                                    <ResponsiveContainer width="100%" height={300} key={`power-${chartKey}`}>
                                        <LineChart data={readingHistory[liveReadings[0]?.machineId] || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                            <XAxis dataKey="index" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                                                labelStyle={{ color: '#000' }}
                                                formatter={(value: any) => `${(value as number).toFixed(2)} kW`}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="power"
                                                stroke="#3b82f6"
                                                dot={false}
                                                isAnimationActive={false}
                                                strokeWidth={2}
                                                name="Power (kW)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Temperature Chart */}
                                <div className="card border border-border">
                                    <h3 className="font-semibold text-text-primary mb-4">Temperature (°C)</h3>
                                    <ResponsiveContainer width="100%" height={300} key={`temp-${chartKey}`}>
                                        <LineChart data={readingHistory[liveReadings[0]?.machineId] || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                            <XAxis dataKey="index" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                                                labelStyle={{ color: '#000' }}
                                                formatter={(value: any) => `${(value as number).toFixed(1)}°C`}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="temperature"
                                                stroke="#f97316"
                                                dot={false}
                                                isAnimationActive={false}
                                                strokeWidth={2}
                                                name="Temperature (°C)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Readings Cards */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-text-primary">Live Readings</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {liveReadings.map((r) => (
                                <div key={r.machineId} className="card hover:shadow-card-hover transition-shadow border border-border">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-text-primary text-sm leading-tight">{r.machineName}</h3>
                                            <p className="text-xs text-muted mt-0.5">Type: {r.machineType}</p>
                                        </div>
                                        <span className={`w-2.5 h-2.5 rounded-full mt-1 ${STATUS_COLOR[r.status]}`} title={r.status} />
                                    </div>

                                    {/* Machine ID */}
                                    <div className="text-xs text-muted mb-3 font-mono truncate">
                                        ID: {r.machineId.slice(-8)}
                                    </div>

                                    {/* Metrics grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-surface rounded-lg p-2">
                                            <div className="flex items-center gap-1 text-muted mb-1">
                                                <Zap size={10} /> <span>Voltage</span>
                                            </div>
                                            <span className="font-bold text-text-primary">{r.voltage.toFixed(1)} V</span>
                                        </div>
                                        <div className="bg-surface rounded-lg p-2">
                                            <div className="flex items-center gap-1 text-muted mb-1">
                                                <Zap size={10} /> <span>Current</span>
                                            </div>
                                            <span className="font-bold text-text-primary">{r.current.toFixed(1)} A</span>
                                        </div>
                                        <div className="bg-surface rounded-lg p-2">
                                            <div className="flex items-center gap-1 text-muted mb-1">
                                                <Cpu size={10} /> <span>Power</span>
                                            </div>
                                            <span className={`font-bold ${r.power > 40 ? 'text-alert' : 'text-text-primary'}`}>
                                                {r.power.toFixed(2)} kW
                                            </span>
                                        </div>
                                        <div className="bg-surface rounded-lg p-2">
                                            <div className="flex items-center gap-1 text-muted mb-1">
                                                <Thermometer size={10} /> <span>Temp</span>
                                            </div>
                                            <span className={`font-bold ${r.temperature > 80 ? 'text-orange-500' : 'text-text-primary'}`}>
                                                {r.temperature.toFixed(1)}°C
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted">
                                        <span>Runtime: <strong className="text-text-primary">{r.runtime.toFixed(1)}h</strong></span>
                                        <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
