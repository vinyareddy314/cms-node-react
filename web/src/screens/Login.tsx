import { useState } from 'react';
import { api } from '../api';
import { User } from '../types';
import { jwtDecode } from 'jwt-decode';

interface LoginProps {
    onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.call('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            localStorage.setItem('token', data.access_token);

            const decoded: any = jwtDecode(data.access_token);
            onLogin({
                id: decoded.sub || decoded.id,
                email: decoded.email,
                role: decoded.role || 'editor'
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div style={{ width: 400, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>Mini CMS</h1>
                <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>Manage programs, terms, and lessons</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
                    </div>

                    {error && <div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 13 }}>{error}</div>}

                    <button type="submit" disabled={loading}
                        style={{ padding: '12px', background: loading ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
                        <strong>Demo:</strong> admin@example.com / editor@example.com / viewer@example.com<br />
                        <em>Password: password123</em>
                    </div>
                </form>
            </div>
        </div>
    );
}
