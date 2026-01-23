import { useState, useEffect } from 'react';
import { api } from '../api';
import { Program, User, Topic } from '../types';
import { CreateProgramModal } from '../components/CreateProgramModal';

interface ProgramsListProps {
    user: User;
    onSelect: (programId: string) => void;
    onLogout: () => void;
}

export function ProgramsList({ user, onSelect, onLogout }: ProgramsListProps) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [topics, setTopics] = useState<Topic[]>([]);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLang, setFilterLang] = useState('');
    const [filterTopic, setFilterTopic] = useState('');

    useEffect(() => {
        loadTopics();
    }, []);

    useEffect(() => {
        loadPrograms();
    }, [filterStatus, filterLang, filterTopic]);

    const loadTopics = async () => {
        try {
            const data = await api.call('/cms/topics');
            setTopics(data.topics || []);
        } catch (err) {
            console.error(err);
        }
    };

    const loadPrograms = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterLang) params.append('language_primary', filterLang);
            if (filterTopic) params.append('topic', filterTopic);

            const data = await api.call(`/cms/programs?${params.toString()}`);
            setPrograms(data.programs || []);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24 }}>Programs</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{user.email} ({user.role})</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {user.role !== 'viewer' && (
                        <button onClick={() => setShowCreate(true)}
                            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                            + New Program
                        </button>
                    )}
                    <button onClick={onLogout} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 12, overflowX: 'auto' }}>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
                <select value={filterLang} onChange={e => setFilterLang(e.target.value)}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                    <option value="">All Languages</option>
                    <option value="en">English</option>
                    <option value="te">Telugu</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                </select>
                <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                    <option value="">All Topics</option>
                    {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            <div style={{ padding: 24 }}>
                {loading ? <p>Loading...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                        {programs.map(p => {
                            const poster = p.assets?.posters?.[p.language_primary]?.portrait;
                            return (
                                <div key={p.id} onClick={() => onSelect(p.id)}
                                    style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e5e7eb', transition: 'transform 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

                                    {poster ? (
                                        <img src={poster} alt={p.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            No poster
                                        </div>
                                    )}

                                    <div style={{ padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <h3 style={{ margin: 0, fontSize: 16 }}>{p.title}</h3>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                                                background: p.status === 'published' ? '#d1fae5' : '#f3f4f6',
                                                color: p.status === 'published' ? '#065f46' : '#6b7280'
                                            }}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <p style={{ margin: '8px 0', fontSize: 13, color: '#6b7280', height: 40, overflow: 'hidden' }}>
                                            {p.description || 'No description'}
                                        </p>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                                            Language: <strong>{p.language_primary}</strong>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreate && <CreateProgramModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadPrograms(); }} />}
        </div>
    );
}
