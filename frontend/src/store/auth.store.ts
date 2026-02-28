import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                localStorage.setItem('nexova_token', token);
                localStorage.setItem('nexova_user', JSON.stringify(user));
                set({ user, token, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem('nexova_token');
                localStorage.removeItem('nexova_user');
                set({ user: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: 'nexova-auth',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
