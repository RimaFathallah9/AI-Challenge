import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { User, Role } from '../types';
import { Shield, Trash2, Users, Factory, Activity, Bell } from 'lucide-react';

export function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [sysStats, setSysStats] = useState<any>(null);

    const load = () => {
        adminApi.getUsers().then(r => setUsers(r.data)).catch(() => { });
        adminApi.getStats().then(r => setSysStats(r.data)).catch(() => { });
    };
    useEffect(() => { load(); }, []);

    const changeRole = async (id: string, role: string) => {
        await adminApi.updateRole(id, role);
        load();
    };
    const deleteUser = async (id: string) => {
        if (confirm('Delete user?')) { await adminApi.deleteUser(id); load(); }
    };

    const statCards = [
        { icon: Users, label: 'Total Users', value: sysStats?.users || 0 },
        { icon: Factory, label: 'Factories', value: sysStats?.factories || 0 },
        { icon: Activity, label: 'Machines', value: sysStats?.machines || 0 },
        { icon: Bell, label: 'Active Alerts', value: sysStats?.activeAlerts || 0 },
    ];

    return (
        <div className="animate-fade-in">
            <h1 className="text-xl font-bold text-text-primary mb-5">System Administration</h1>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {statCards.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="card flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            <Icon size={20} className="text-primary-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted">{label}</p>
                            <p className="text-xl font-bold text-text-primary">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Management */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-primary-600" />
                    <h2 className="font-semibold text-text-primary">User Management</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {['Name', 'Email', 'Role', 'Factory', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="text-left py-2 px-3 text-muted font-medium text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-border/50 hover:bg-surface/50">
                                    <td className="py-2.5 px-3 font-medium">{u.name || '—'}</td>
                                    <td className="py-2.5 px-3 text-muted">{u.email}</td>
                                    <td className="py-2.5 px-3">
                                        <select
                                            value={u.role}
                                            onChange={e => changeRole(u.id, e.target.value)}
                                            className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                                        >
                                            {(['ADMIN', 'MANAGER', 'TECHNICIAN'] as Role[]).map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-2.5 px-3 text-muted text-xs">{u.factoryId || '—'}</td>
                                    <td className="py-2.5 px-3 text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="py-2.5 px-3">
                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-muted">No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
