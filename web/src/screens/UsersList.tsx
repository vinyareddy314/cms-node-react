import { useState, useEffect } from 'react';
import { api } from '../api';
import { User } from '../types';

interface UsersListProps {
    user: User;
    onLogout: () => void;
}

export function UsersList({ user, onLogout }: UsersListProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'viewer' as 'admin' | 'editor' | 'viewer'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.call<{ data: User[] }>('/cms/users');
            setUsers(res.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (u: User) => {
        setEditingUser(u);
        setFormData({
            email: u.email,
            password: '', // Don't show hash, allow empty to keep unchanged
            role: u.role
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            role: 'viewer'
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.call(`/cms/users/${id}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const payload: any = {
                    email: formData.email,
                    role: formData.role
                };
                if (formData.password) payload.password = formData.password;

                const updated = await api.call<User>(`/cms/users/${editingUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                setUsers(users.map(u => u.id === updated.id ? updated : u));
            } else {
                const created = await api.call<User>('/cms/users', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                setUsers([created, ...users]);
            }
            setShowModal(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading users...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 6 }}></div>
                        <span style={{ fontWeight: 600, fontSize: 18 }}>Mini CMS</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{user.email}</span>
                            <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{user.role}</span>
                        </div>
                        <button onClick={onLogout} style={{ fontSize: 14, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '32px auto', padding: '0 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Users</h1>
                    <button onClick={handleCreate}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 500, cursor: 'pointer' }}>
                        Add User
                    </button>
                </div>

                {error && <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 24 }}>{error}</div>}

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 500 }}>{u.email}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                                            background: u.role === 'admin' ? '#dbeafe' : u.role === 'editor' ? '#dcfce7' : '#f3f4f6',
                                            color: u.role === 'admin' ? '#1e40af' : u.role === 'editor' ? '#166534' : '#374151'
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{u.id}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(u)} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', marginRight: 16 }}>Edit</button>
                                        <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 500, cursor: 'pointer' }} disabled={u.id === user.id}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{ background: '#fff', borderRadius: 12, width: 500, padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ marginTop: 0, fontSize: 20 }}>{editingUser ? 'Edit User' : 'New User'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                                    Password {editingUser && <span style={{ fontWeight: 400, color: '#6b7280' }}>(leave blank to keep unchanged)</span>}
                                </label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required={!editingUser}
                                    placeholder={editingUser ? '••••••••' : ''}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Role</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                <button type="button" onClick={() => setShowModal(false)}
                                    style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit"
                                    style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
