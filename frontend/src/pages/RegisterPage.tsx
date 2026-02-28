import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';

export function RegisterPage() {
    const [form, setForm] = useState({ email: '', password: '', name: '', role: 'TECHNICIAN' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authApi.register(form);
            setAuth(res.data.user, res.data.accessToken);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <div className="hidden md:flex w-2/5 bg-primary-600 items-center justify-center">
                <div className="text-center">
                    <h1 className="text-white text-5xl font-light">Create Account</h1>
                    <p className="text-green-200 mt-3 text-sm">NEXOVA Energy Intelligence</p>
                </div>
            </div>
            <div className="flex-1 bg-[#8FBC8F]/30 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-center text-2xl font-semibold text-primary-700 mb-8">Create Account</h2>
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" placeholder="Full Name" value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
                        <input type="email" placeholder="Email" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" required />
                        <input type="password" placeholder="Password" value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required />
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                            className="input-field">
                            <option value="TECHNICIAN">Technician</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                        <p className="text-center text-sm text-muted">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:underline font-medium">Login</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
