import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { alertApi } from '../services/api';
import { Alert, AlertSeverity } from '../types';

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
    LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
};

const DONUT_COLORS = ['#1B4332', '#40916C', '#D1FAE5'];

export function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [selected, setSelected] = useState<Alert | null>(null);

    const loadData = () => {
        alertApi.getAll(false).then(r => setAlerts(r.data)).catch(() => { });
        alertApi.getStats().then(r => setStats(r.data)).catch(() => { });
    };

    useEffect(() => { loadData(); }, []);

    const handleResolve = async (id: string) => {
        await alertApi.resolve(id);
        loadData();
    };

    // Build bar chart from alerts by month (last 7)
    const barData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en', { weekday: 'short' });
        const count = alerts.filter(a => {
            const ad = new Date(a.createdAt);
            return ad.toDateString() === d.toDateString();
        }).length;
        return { name: label, value: count };
    });

    const donutData = [
        { name: 'High Priority', value: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length || 4 },
        { name: 'High Consume', value: alerts.filter(a => a.severity === 'MEDIUM').length || 3 },
        { name: 'Other', value: alerts.filter(a => a.severity === 'LOW').length || 2 },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-xl font-bold text-text-primary mb-5">Alerts and notifications</h1>

            {/* Charts row */}
            <div className="card mb-5">
                <h2 className="font-semibold text-text-primary mb-4">Number of alerts</h2>
                <div className="grid grid-cols-3 gap-6">
                    {/* Bar chart */}
                    <div className="col-span-2">
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={barData}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="value" fill="#40916C" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Donut */}
                    <div className="flex items-center gap-4">
                        <PieChart width={110} height={110}>
                            <Pie data={donutData} cx={50} cy={50} innerRadius={30} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
                                {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                            </Pie>
                        </PieChart>
                        <div className="space-y-2">
                            {donutData.map((d, i) => (
                                <div key={d.name} className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                                    <span className="text-muted">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert list */}
            <div>
                <h2 className="font-semibold text-text-primary mb-3">Alerts</h2>
                {alerts.length === 0 ? (
                    <div className="card text-center py-12 text-muted">
                        <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
                        <p>No active alerts — all systems operational</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {alerts.map((alert) => {
                            const style = SEVERITY_COLORS[alert.severity];
                            return (
                                <div
                                    key={alert.id}
                                    onClick={() => setSelected(alert)}
                                    className={`card border ${style.border} ${style.bg} cursor-pointer hover:shadow-card-hover transition-shadow`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertTriangle size={16} className={style.text} />
                                                <span className={`font-semibold text-sm ${style.text}`}>Alert</span>
                                                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text} border ${style.border}`}>
                                                    {alert.severity}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-secondary line-clamp-2">{alert.message}</p>
                                            <p className="text-xs text-muted mt-1">{alert.machine?.name} • {new Date(alert.createdAt).toLocaleString()}</p>
                                        </div>
                                        <AlertTriangle size={24} className={`${style.text} ml-3 flex-shrink-0`} fill="currentColor" fillOpacity={0.2} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Alert Detail Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fade-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={20} className="text-alert" />
                                <h3 className="font-bold text-text-primary">Alert</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[selected.severity].bg} ${SEVERITY_COLORS[selected.severity].text} border ${SEVERITY_COLORS[selected.severity].border}`}>
                                    {selected.severity}
                                </span>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface rounded-lg">
                                <X size={18} className="text-muted" />
                            </button>
                        </div>

                        <p className="font-medium text-text-primary mb-2">{selected.message}</p>
                        {selected.details && (
                            <p className="text-sm text-text-secondary mb-4 leading-relaxed">{selected.details}</p>
                        )}

                        <div className="bg-surface rounded-xl p-4 mb-4 text-sm space-y-1">
                            <div className="flex justify-between"><span className="text-muted">Machine</span><span className="font-medium">{selected.machine?.name || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-medium text-orange-600">Active</span></div>
                            <div className="flex justify-between"><span className="text-muted">Created</span><span className="font-medium">{new Date(selected.createdAt).toLocaleString()}</span></div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
                            <p className="font-semibold text-amber-800 mb-2">Recommended Actions</p>
                            <ul className="text-amber-700 space-y-1 list-disc list-inside">
                                <li>Immediately check the machine's electrical connections</li>
                                <li>Check lubrication levels and cooling systems</li>
                                <li>Verify system parameters and update software if needed</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { handleResolve(selected.id); setSelected(null); }}
                                className="btn-primary flex-1"
                            >
                                Mark as Resolved
                            </button>
                            <button onClick={() => setSelected(null)} className="btn-ghost flex-1">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
