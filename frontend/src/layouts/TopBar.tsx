import { Search, Bell, Sun } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export function TopBar() {
    const { user } = useAuthStore();
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : (user?.email?.[0].toUpperCase() || 'U');

    return (
        <header className="h-16 bg-white border-b border-border px-6 flex items-center gap-4 flex-shrink-0">
            {/* Search bar */}
            <div className="flex-1 max-w-xl relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full bg-surface rounded-full pl-9 pr-4 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
            </div>

            {/* Icons */}
            <div className="flex items-center gap-3 ml-auto">
                <button className="p-2 rounded-full hover:bg-surface transition-colors">
                    <Sun size={18} className="text-muted" />
                </button>
                <button className="p-2 rounded-full hover:bg-surface transition-colors relative">
                    <Bell size={18} className="text-muted" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-alert rounded-full" />
                </button>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                    {initials}
                </div>
            </div>
        </header>
    );
}
