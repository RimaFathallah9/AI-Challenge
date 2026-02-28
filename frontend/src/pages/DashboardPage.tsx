import { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { MoreHorizontal, AlertTriangle, Play } from 'lucide-react';
import { energyApi, alertApi } from '../services/api';
import { useDashboardStore } from '../store/dashboard.store';
import { useWebSocket } from '../hooks/useWebSocket';
import { Alert } from '../types';
import { useNavigate } from 'react-router-dom';

// Additional Icons
import { Activity, Zap, ServerCrash } from 'lucide-react';

// --- Mock yearly trend data (filled from API if available)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateYearData(baseMultiplier = 1) {
    return MONTHS.map((month) => ({
        month,
        thisYear: Math.round((30 + Math.random() * 40) * baseMultiplier),
        lastYear: Math.round((20 + Math.random() * 35) * baseMultiplier),
    }));
}

const DONUT_DATA = [
    { name: 'HVAC', value: 45.1, color: '#1B4332' },
    { name: 'Lighting Systems', value: 40.8, color: '#2D6A4F' },
    { name: 'Machinery', value: 26.8, color: '#40916C' },
    { name: 'Solar panels', value: 34.4, color: '#52B788' },
    { name: 'Water Pumps', value: 27.2, color: '#74C69D' },
];

const COMPARISON_DATA = [
    { name: 'solar', value: 18 },
    { name: 'wind', value: 28 },
    { name: 'Elect', value: 15 },
    { name: 'Thermal', value: 25 },
    { name: 'Mercha', value: 10 },
    { name: 'Other', value: 22 },
];

const COMPARISON_COLORS = ['#B7E4C7', '#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D'];

// KPI Card
function KpiCard({ label, value, change, changeColor }: { label: string; value: string; change: string; changeColor: string }) {
    return (
        <div className="bg-primary-600 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-start mb-3">
                <span className="text-green-200 text-xs font-medium">{label}</span>
                <MoreHorizontal size={16} className="text-green-300 cursor-pointer" />
            </div>
            <div className="text-2xl font-bold">
                {value}
                <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${changeColor}`}>{change}</span>
            </div>
        </div>
    );
}

export function DashboardPage() {
    const [yearData] = useState(generateYearData());
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const { stats, setStats } = useDashboardStore();

    // Connect WebSocket for live data
    useWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        energyApi.getDashboardStats().then(res => setStats(res.data)).catch(() => { });
        alertApi.getAll(false).then(res => setAlerts(res.data?.slice(0, 2) || [])).catch(() => { });
    }, []);

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Date range */}
            <div className="flex justify-end">
                <button className="text-sm border border-border bg-white rounded-xl px-4 py-2 text-muted hover:border-primary-400 transition-colors flex items-center gap-2">
                    17 April 2020 – 21 May 2020
                    <span className="text-xs">▾</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Energy" value={`${stats?.totalToday ? (stats.totalToday / 1000).toFixed(1) + 'K' : '50.8K'}`} change="▲ 28.4%" changeColor="bg-green-500/30 text-green-200" />
                <KpiCard label="Energy" value="23.6K" change="▼ 12.6%" changeColor="bg-red-500/30 text-red-200" />
                <KpiCard label="Energy Trades" value={stats?.machineCount ? `${stats.machineCount * 126}` : '756'} change="▲ 3.7%" changeColor="bg-green-500/30 text-green-200" />
                <KpiCard label="$ Average Revenue" value="2.3K" change="▲ 11.5%" changeColor="bg-green-500/30 text-green-200" />
            </div>

            {/* Main content row */}
            <div className="grid grid-cols-3 gap-4">
                {/* Energy Consumption Chart */}
                <div className="col-span-2 card">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-text-primary">Energy consumption</h3>
                            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">K</div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted">
                            <span className="font-medium text-text-primary">This year</span>
                            <span>Last year</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={yearData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="thisYearGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                            <Area type="monotone" dataKey="lastYear" stroke="#D1FAE5" strokeWidth={1.5} fill="transparent" strokeDasharray="5 5" dot={false} />
                            <Area type="monotone" dataKey="thisYear" stroke="#2D6A4F" strokeWidth={2} fill="url(#thisYearGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Right panel */}
                <div className="flex flex-col gap-4">
                    {/* Alerts card */}
                    <div className="card border-2 border-alert/30 flex-1">
                        <h3 className="font-bold text-lg text-text-primary mb-3">Alerts</h3>
                        <div className="flex items-center justify-center py-4">
                            <AlertTriangle size={48} className="text-alert" fill="#E63946" fillOpacity={0.15} />
                        </div>
                        {stats?.activeAlerts ? (
                            <p className="text-center text-sm text-muted mt-1">{stats.activeAlerts} active alert{stats.activeAlerts !== 1 ? 's' : ''}</p>
                        ) : null}
                        <button onClick={() => navigate('/alerts')} className="w-full mt-3 text-xs text-primary-600 hover:underline">
                            View all alerts →
                        </button>
                    </div>

                    {/* Real Data Overview */}
                    <div className="card flex-1 relative">
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">K</div>
                        </div>
                        <h3 className="font-semibold text-text-primary mb-1">Real Data</h3>
                        <p className="text-sm text-muted mb-4">Overview</p>
                        <div className="flex items-center justify-center">
                            <button
                                onClick={() => navigate('/monitoring')}
                                className="w-16 h-16 rounded-full border-4 border-primary-600 flex items-center justify-center hover:bg-primary-50 transition-colors group"
                            >
                                <span className="text-xs font-bold text-primary-700 group-hover:text-primary-800">START</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Autonomous Metrics Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-blue-500" size={20} />
                        <h3 className="font-semibold text-text-primary">AI Decision Timeline</h3>
                    </div>
                    <div className="space-y-3">
                        {/* Mock Live Log - in a real app these would stream via Websocket from AIDecisionLogs */}
                        <div className="p-3 border border-border rounded-lg bg-background flex items-start gap-3">
                            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg shrink-0"><ServerCrash size={16} /></div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">Extruder-1 (Overheating) → Action: MAINTENANCE</p>
                                <p className="text-xs text-muted mt-1">AI Reasoning: Temp rose 15% in 10 mins. Safely simulated cooling protocols to avoid thermal damage. Prevented $4,200 loss.</p>
                            </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-background flex items-start gap-3">
                            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg shrink-0"><Zap size={16} /></div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">CNC-Alpha (Power Spike) → Action: OFFLINE</p>
                                <p className="text-xs text-muted mt-1">AI Reasoning: Current exceeded safe operational threshold by 45%. Triggered emergency stop to protect internal circuits.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-[#1a2c26] to-surface border-green-500/20">
                    <h3 className="font-semibold text-green-400 mb-2 border-b border-green-500/20 pb-2">Predictive Maintenance</h3>
                    <p className="text-xs text-muted mb-4">AI identifies machines trending towards failure.</p>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-primary">Conveyor-B (Vibration)</span>
                                <span className="text-red-400 font-bold">88% Risk</span>
                            </div>
                            <div className="w-full bg-background rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: '88%' }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-primary">Press-Hydraulic (Heat)</span>
                                <span className="text-orange-400 font-bold">62% Risk</span>
                            </div>
                            <div className="w-full bg-background rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '62%' }}></div></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Donut chart */}
                <div className="card">
                    <div className="flex items-center gap-6">
                        <PieChart width={160} height={160}>
                            <Pie data={DONUT_DATA} cx={75} cy={75} innerRadius={45} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                                {DONUT_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                        <div className="space-y-2">
                            {DONUT_DATA.map((d) => (
                                <div key={d.name} className="flex items-center gap-2 text-sm">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                    <span className="text-muted">{d.name}</span>
                                    <span className="ml-auto font-semibold text-text-primary">{d.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bar comparison */}
                <div className="card">
                    <h3 className="font-semibold text-text-primary mb-3">Energy comparaison</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={COMPARISON_DATA} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {COMPARISON_DATA.map((_, i) => <Cell key={i} fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
