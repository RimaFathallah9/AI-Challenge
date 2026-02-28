import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Activity, Bell, Settings2, ShieldCheck, Settings, LogOut, Cpu, Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', to: '/dashboard' },
    { icon: Activity, label: 'Data Monitoring & Visualization', to: '/monitoring' },
    { icon: Zap, label: 'Virtual Digital Twin', to: '/digital-twin' },
    { icon: Cpu, label: 'RL Energy Optimizer', to: '/rl-optimizer' },
    { icon: Bell, label: 'Alerts & Notifications', to: '/alerts' },
    { icon: Settings2, label: 'Machine Control & Automation', to: '/machines' },
    { icon: ShieldCheck, label: 'System Administration', to: '/admin' },
    { icon: Settings, label: 'Setttings', to: '/settings' },
];

export function Sidebar() {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-[220px] min-h-screen bg-sidebar flex flex-col shadow-sidebar flex-shrink-0">
            {/* Logo */}
            <div className="px-6 pt-8 pb-6">
                <h1 className="text-white text-xl font-bold tracking-wide">NEXOVA</h1>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map(({ icon: Icon, label, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
                        }
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        <span className="leading-tight text-xs">{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-4 mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-green-200 hover:text-white text-sm font-medium w-full px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all"
                >
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
