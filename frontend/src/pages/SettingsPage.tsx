import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { Bell, Lock, User, Globe } from 'lucide-react';

export function SettingsPage() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState({ email: true, push: true, alerts: true });
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="animate-fade-in max-w-2xl">
            <h1 className="text-xl font-bold text-text-primary mb-6">Settings</h1>

            {/* Profile */}
            <div className="card mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <User size={18} className="text-primary-600" />
                    <h2 className="font-semibold">Profile</h2>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">Email</label>
                        <input className="input-field" value={user?.email || ''} readOnly />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">Name</label>
                        <input className="input-field" defaultValue={user?.name || ''} placeholder="Your name" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">Role</label>
                        <input className="input-field bg-surface" value={user?.role || ''} readOnly />
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="card mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Bell size={18} className="text-primary-600" />
                    <h2 className="font-semibold">Notifications</h2>
                </div>
                {[
                    { key: 'email', label: 'Email notifications' },
                    { key: 'push', label: 'Push notifications' },
                    { key: 'alerts', label: 'Critical alert notifications' },
                ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm">{label}</span>
                        <button
                            onClick={() => setNotifications(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                            className={`w-10 h-5 rounded-full transition-colors relative ${notifications[key as keyof typeof notifications] ? 'bg-primary-600' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                ))}
            </div>

            <button onClick={handleSave} className={`btn-primary ${saved ? 'bg-green-600' : ''}`}>
                {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
        </div>
    );
}
