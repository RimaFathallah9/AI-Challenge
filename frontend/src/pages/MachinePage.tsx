import { useEffect, useState, useCallback } from 'react';
import { machineApi } from '../services/api';
import { Machine, MachineStatus } from '../types';
import {
    Plus, Edit2, Trash2, X, Clock, CheckCircle, XCircle,
    AlertTriangle, Info, Zap, Thermometer, Activity,
    User, Calendar, Shield, BarChart2, ChevronRight, Wrench
} from 'lucide-react';

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('nexova_user') || '{}'); }
    catch { return {}; }
}

const STATUS_BADGE: Record<MachineStatus, string> = {
    ONLINE: 'badge-online',
    OFFLINE: 'badge-offline',
    MAINTENANCE: 'badge-warning',
    WARNING: 'badge-medium',
    CRITICAL: 'badge-critical',
};

const STATUS_DOT: Record<MachineStatus, string> = {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-gray-400',
    MAINTENANCE: 'bg-yellow-400',
    WARNING: 'bg-orange-400',
    CRITICAL: 'bg-red-500',
};

const MACHINE_TYPES = ['Hydraulic Press', 'CNC Machine', 'Conveyor Belt', 'Air Compressor', 'Welding Robot'];

interface MachineDetail extends Machine {
    createdBy?: { name?: string; email: string; role: string };
    approvedBy?: { name?: string; email: string };
    approvedAt?: string;
    approvalStatus?: string;
    energyReadings?: any[];
    alerts?: any[];
    recommendations?: any[];
}

export function MachinePage() {
    const [machines, setMachines] = useState<MachineDetail[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<MachineDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [editing, setEditing] = useState<MachineDetail | null>(null);
    const [form, setForm] = useState({ name: '', type: 'CNC Machine', factoryId: 'default-factory-id', status: 'ONLINE' as MachineStatus });
    const [submittedPending, setSubmittedPending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const user = getCurrentUser();
    const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';

    const load = useCallback(() =>
        machineApi.getAll().then(r => setMachines(r.data || [])).catch(() => { }), []);

    useEffect(() => { load(); }, [load]);

    // For non-admin users: show approved machines + their own pending submissions
    // For admin users: show all machines
    const visibleMachines = isAdmin 
        ? machines 
        : machines.filter(m => m.approvalStatus === 'APPROVED' || !m.approvalStatus || m.createdBy?.email === user.email);

    // Open the rich detail panel for a machine
    const openDetail = async (m: MachineDetail) => {
        setSelectedMachine(m);
        setLoadingDetail(true);
        try {
            const res = await machineApi.getById(m.id);
            setSelectedMachine(res.data);
        } catch { /* keep basic data */ }
        finally { setLoadingDetail(false); }
    };

    const openCreate = () => {
        setError(null);
        setEditing(null); 
        setSubmittedPending(false);
        setForm({ name: '', type: 'CNC Machine', factoryId: 'default-factory-id', status: 'ONLINE' });
        setShowModal(true);
    };
    const openEdit = (m: MachineDetail, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(m);
        setForm({ name: m.name, type: m.type, factoryId: m.factoryId, status: m.status });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            if (!form.name || !form.type) {
                setError('Please fill in all required fields');
                return;
            }
            if (editing) {
                await machineApi.update(editing.id, form);
            } else {
                const res = await machineApi.create(form);
                if ((res.data as any)?.approvalStatus === 'PENDING') {
                    setSubmittedPending(true);
                    setShowModal(false);
                    load();
                    return;
                }
                // Auto-open detail panel for newly created machine
                setSelectedMachine(res.data);
            }
            setShowModal(false);
            load();
        } catch (err: any) {
            const message = err.response?.data?.error || err.message || 'Failed to save machine';
            setError(message);
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this machine?')) { await machineApi.delete(id); load(); }
    };

    const handleApprove = async (id: string, action: 'APPROVED' | 'REJECTED', e: React.MouseEvent) => {
        e.stopPropagation();
        await machineApi.approve(id, action);
        load();
    };

    // Compute derived metrics from full machine data
    const getWorkingHours = (m: MachineDetail) => {
        const readings = m.energyReadings?.length || m._count?.energyReadings || 0;
        return (readings * 2 / 60).toFixed(1); // each reading = 2s interval → hours
    };

    const getBreakdownCount = (m: MachineDetail) =>
        m.alerts?.filter((a: any) => ['CRITICAL', 'HIGH'].includes(a.severity)).length
        ?? m._count?.alerts ?? 0;

    const getAvgTemp = (m: MachineDetail) => {
        if (!m.energyReadings?.length) return null;
        const avg = m.energyReadings.reduce((s: number, r: any) => s + r.temperature, 0) / m.energyReadings.length;
        return avg.toFixed(1);
    };

    const getAvgPower = (m: MachineDetail) => {
        if (!m.energyReadings?.length) return null;
        const avg = m.energyReadings.reduce((s: number, r: any) => s + r.power, 0) / m.energyReadings.length;
        return avg.toFixed(2);
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-text-primary">Machine Control & Automation</h1>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Machine
                </button>
            </div>

            {/* Pending submitted notice */}
            {submittedPending && !isAdmin && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
                    <Clock size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">Machine submitted for approval</p>
                        <p className="text-xs mt-0.5">An admin will review your request. It will appear once approved.</p>
                    </div>
                </div>
            )}

            {/* Admin: Pending approvals */}
            {isAdmin && machines.filter(m => m.approvalStatus === 'PENDING').length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={18} className="text-orange-500" />
                        <h2 className="font-semibold text-text-primary">Pending Approval ({machines.filter(m => m.approvalStatus === 'PENDING').length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {machines.filter(m => m.approvalStatus === 'PENDING').map((m: any) => (
                            <div key={m.id} onClick={() => openDetail(m)}
                                className="card border-2 border-orange-200 bg-orange-50/30 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-text-primary">{m.name}</h3>
                                        <p className="text-xs text-muted">{m.type}</p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                                        <Clock size={10} /> PENDING
                                    </span>
                                </div>
                                {m.createdBy && (
                                    <p className="text-xs text-muted mb-3">By: <span className="font-medium">{m.createdBy.name || m.createdBy.email}</span></p>
                                )}
                                <div className="flex gap-2 mt-3 border-t border-orange-200 pt-3">
                                    <button onClick={(e) => handleApprove(m.id, 'APPROVED', e)}
                                        className="flex-1 flex items-center justify-center gap-1 text-sm py-1.5 rounded-xl border border-green-300 text-green-700 hover:bg-green-50 transition-colors font-medium">
                                        <CheckCircle size={14} /> Approve
                                    </button>
                                    <button onClick={(e) => handleApprove(m.id, 'REJECTED', e)}
                                        className="flex-1 flex items-center justify-center gap-1 text-sm py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                        <XCircle size={14} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Machines Grid */}
            <div>
                {isAdmin && machines.filter(m => m.approvalStatus === 'PENDING').length > 0 && (
                    <h2 className="font-semibold text-text-primary mb-3">Active Machines ({visibleMachines.length})</h2>
                )}
                {visibleMachines.length === 0 ? (
                    <div className="card text-center py-16 text-muted">
                        <p className="text-lg font-medium">No machines configured</p>
                        <p className="text-sm mt-1">Click "Add Machine" to register your first machine</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visibleMachines.map((m: any) => (
                            <div key={m.id} onClick={() => openDetail(m)}
                                className="card hover:shadow-card-hover transition-all cursor-pointer border border-border hover:border-primary-400 group">
                                {/* Top row */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[m.status as MachineStatus]}`} />
                                            <h3 className="font-semibold text-text-primary truncate">{m.name}</h3>
                                            {(m.approvalStatus === 'PENDING') && (
                                                <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full whitespace-nowrap flex items-center gap-1">
                                                    <Clock size={10} /> PENDING
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted mt-0.5 ml-4.5">{m.type}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={STATUS_BADGE[m.status as MachineStatus]}>{m.status}</span>
                                        <ChevronRight size={14} className="text-muted group-hover:text-primary-500 transition-colors" />
                                    </div>
                                </div>

                                {/* Factory */}
                                <p className="text-xs text-muted mb-3 ml-4.5">{m.factory?.name || 'No factory assigned'}</p>

                                {/* Quick stats */}
                                <div className="grid grid-cols-3 gap-2 text-xs border-t border-border pt-3">
                                    <div className="text-center">
                                        <p className="text-muted">Readings</p>
                                        <p className="font-bold text-text-primary">{m._count?.energyReadings || 0}</p>
                                    </div>
                                    <div className="text-center border-x border-border">
                                        <p className="text-muted">Alerts</p>
                                        <p className={`font-bold ${(m._count?.alerts || 0) > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                                            {m._count?.alerts || 0}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-muted">Hours</p>
                                        <p className="font-bold text-text-primary">
                                            {((m._count?.energyReadings || 0) * 2 / 3600).toFixed(1)}h
                                        </p>
                                    </div>
                                </div>

                                {/* Created by */}
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                                    <span className="text-xs text-muted flex items-center gap-1">
                                        <User size={10} />
                                        {m.createdBy?.name || m.createdBy?.email || 'System'}
                                    </span>
                                    <span className="text-xs text-muted flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(m.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Edit/Delete (Admin only) */}
                                {isAdmin && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={(e) => openEdit(m, e)}
                                            className="btn-ghost flex-1 flex items-center justify-center gap-1 text-sm py-1.5">
                                            <Edit2 size={13} /> Edit
                                        </button>
                                        <button onClick={(e) => handleDelete(m.id, e)}
                                            className="flex-1 flex items-center justify-center gap-1 text-sm py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Rich Machine Detail Panel ──────────────────────── */}
            {selectedMachine && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end" onClick={() => setSelectedMachine(null)}>
                    <div onClick={e => e.stopPropagation()}
                        className="h-full w-full max-w-lg bg-surface shadow-2xl overflow-y-auto animate-fade-in flex flex-col">

                        {/* Panel Header */}
                        <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-3 h-3 rounded-full ${STATUS_DOT[selectedMachine.status as MachineStatus]}`} />
                                    <h2 className="text-lg font-bold text-text-primary">{selectedMachine.name}</h2>
                                </div>
                                <p className="text-sm text-muted">{selectedMachine.type} · {selectedMachine.factory?.name}</p>
                            </div>
                            <button onClick={() => setSelectedMachine(null)}
                                className="p-2 hover:bg-background rounded-lg text-muted hover:text-text-primary transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="p-5 space-y-5 flex-1">

                                {/* Identity Block */}
                                <div className="bg-background rounded-xl p-4 space-y-3 border border-border">
                                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                        <Info size={12} /> Identity
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                                        <span className="text-muted">Machine ID</span>
                                        <span className="font-mono text-xs text-text-primary font-medium truncate">{selectedMachine.id}</span>

                                        <span className="text-muted">Data Type</span>
                                        <span className="text-text-primary">{selectedMachine.type}</span>

                                        <span className="text-muted">Status</span>
                                        <span className={STATUS_BADGE[selectedMachine.status as MachineStatus]}>{selectedMachine.status}</span>

                                        <span className="text-muted">Approval</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex w-fit ${(selectedMachine as any).approvalStatus === 'APPROVED'
                                                ? 'bg-green-100 text-green-700'
                                                : (selectedMachine as any).approvalStatus === 'PENDING'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {(selectedMachine as any).approvalStatus || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* Working Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-background rounded-xl p-3 border border-border text-center">
                                        <Activity size={18} className="mx-auto text-blue-500 mb-1" />
                                        <p className="text-lg font-bold text-text-primary">{getWorkingHours(selectedMachine)}h</p>
                                        <p className="text-xs text-muted">Working Hours</p>
                                    </div>
                                    <div className="bg-background rounded-xl p-3 border border-border text-center">
                                        <Wrench size={18} className="mx-auto text-red-500 mb-1" />
                                        <p className="text-lg font-bold text-text-primary">{getBreakdownCount(selectedMachine)}</p>
                                        <p className="text-xs text-muted">Breakdowns</p>
                                    </div>
                                    <div className="bg-background rounded-xl p-3 border border-border text-center">
                                        <BarChart2 size={18} className="mx-auto text-green-500 mb-1" />
                                        <p className="text-lg font-bold text-text-primary">{selectedMachine._count?.energyReadings || selectedMachine.energyReadings?.length || 0}</p>
                                        <p className="text-xs text-muted">Total Readings</p>
                                    </div>
                                </div>

                                {/* Live Metrics (if readings available) */}
                                {(getAvgTemp(selectedMachine) || getAvgPower(selectedMachine)) && (
                                    <div className="bg-background rounded-xl p-4 border border-border">
                                        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Zap size={12} /> Average Metrics
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {getAvgTemp(selectedMachine) && (
                                                <div className="flex items-center gap-2">
                                                    <Thermometer size={16} className="text-orange-500" />
                                                    <div>
                                                        <p className="text-xs text-muted">Temperature</p>
                                                        <p className="font-bold text-text-primary">{getAvgTemp(selectedMachine)}°C</p>
                                                    </div>
                                                </div>
                                            )}
                                            {getAvgPower(selectedMachine) && (
                                                <div className="flex items-center gap-2">
                                                    <Zap size={16} className="text-yellow-500" />
                                                    <div>
                                                        <p className="text-xs text-muted">Power Usage</p>
                                                        <p className="font-bold text-text-primary">{getAvgPower(selectedMachine)} kW</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* History / Event Log */}
                                <div className="bg-background rounded-xl p-4 border border-border">
                                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Clock size={12} /> Event Log / History
                                    </h3>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">

                                        {/* Created event — always shown */}
                                        <div className="flex gap-3 text-sm">
                                            <div className="flex flex-col items-center">
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 shrink-0" />
                                                <div className="w-px flex-1 bg-border mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <p className="font-medium text-text-primary">Machine Registered</p>
                                                <p className="text-xs text-muted mt-0.5">
                                                    Added by <span className="font-medium">
                                                        {(selectedMachine as any).createdBy?.name || (selectedMachine as any).createdBy?.email || 'System'}
                                                    </span> ({(selectedMachine as any).createdBy?.role || 'ADMIN'})
                                                </p>
                                                <p className="text-xs text-muted">{new Date(selectedMachine.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Approved event */}
                                        {(selectedMachine as any).approvedAt && (
                                            <div className="flex gap-3 text-sm">
                                                <div className="flex flex-col items-center">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                                                    <div className="w-px flex-1 bg-border mt-1" />
                                                </div>
                                                <div className="pb-3">
                                                    <p className="font-medium text-text-primary">Approved for Operation</p>
                                                    <p className="text-xs text-muted mt-0.5">By <span className="font-medium">
                                                        {(selectedMachine as any).approvedBy?.name || (selectedMachine as any).approvedBy?.email || 'Admin'}
                                                    </span></p>
                                                    <p className="text-xs text-muted">{new Date((selectedMachine as any).approvedAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent alerts as events */}
                                        {selectedMachine.alerts?.slice(0, 5).map((a: any) => (
                                            <div key={a.id} className="flex gap-3 text-sm">
                                                <div className="flex flex-col items-center">
                                                    <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${a.severity === 'CRITICAL' ? 'bg-red-500' :
                                                            a.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-400'
                                                        }`} />
                                                    <div className="w-px flex-1 bg-border mt-1" />
                                                </div>
                                                <div className="pb-3">
                                                    <p className={`font-medium ${a.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`}>
                                                        {a.severity} Alert
                                                    </p>
                                                    <p className="text-xs text-text-primary mt-0.5">{a.message}</p>
                                                    <p className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {(!selectedMachine.alerts || selectedMachine.alerts.length === 0) && (
                                            <p className="text-xs text-muted text-center py-2">No alerts recorded yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Ownership */}
                                <div className="bg-background rounded-xl p-4 border border-border">
                                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Shield size={12} /> Ownership
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <span className="text-muted flex items-center gap-1"><User size={12} /> Created by</span>
                                        <span className="text-text-primary font-medium">
                                            {(selectedMachine as any).createdBy?.name || (selectedMachine as any).createdBy?.email || 'System'}
                                        </span>
                                        <span className="text-muted flex items-center gap-1"><Calendar size={12} /> Created at</span>
                                        <span className="text-text-primary">{new Date(selectedMachine.createdAt).toLocaleDateString()}</span>
                                        {(selectedMachine as any).approvedBy && (
                                            <>
                                                <span className="text-muted flex items-center gap-1"><CheckCircle size={12} /> Approved by</span>
                                                <span className="text-text-primary font-medium">
                                                    {(selectedMachine as any).approvedBy?.name || (selectedMachine as any).approvedBy?.email}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Add / Edit Modal ──────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h2 className="font-bold text-text-primary">{editing ? 'Edit Machine' : 'Add Machine'}</h2>
                                {!editing && !isAdmin && (
                                    <p className="text-xs text-orange-600 mt-0.5">⏳ As a Technician, this will go to admin for approval.</p>
                                )}
                            </div>
                            <button onClick={() => { setShowModal(false); setError(null); }}><X size={18} className="text-muted" /></button>
                        </div>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-text-secondary block mb-1">Machine Name</label>
                                <input className="input-field" placeholder="e.g. Hydraulic Press #3"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-secondary block mb-1">Type</label>
                                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            {isAdmin && (
                                <div>
                                    <label className="text-sm font-medium text-text-secondary block mb-1">Initial Status</label>
                                    <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as MachineStatus })}>
                                        {(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'WARNING', 'CRITICAL'] as MachineStatus[]).map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleSave} disabled={saving || !form.name || !form.type} className="btn-primary flex-1 disabled:opacity-60">
                                {saving ? 'Saving...' : isAdmin ? 'Save & View Details' : 'Submit for Approval'}
                            </button>
                            <button onClick={() => { setShowModal(false); setError(null); }} className="btn-ghost flex-1">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
