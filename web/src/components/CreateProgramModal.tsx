import { useState } from 'react';
import { api } from '../api';

interface CreateProgramModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateProgramModal({ onClose, onSuccess }: CreateProgramModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [lang, setLang] = useState('en');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.call('/cms/programs', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description,
                    language_primary: lang,
                    languages_available: [lang],
                    status: 'draft',
                    topics: [] // You might want to add topic selection here later
                })
            });
            onSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 480, background: '#fff', borderRadius: 10, padding: 24 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Create Program</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} required
                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} required
                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Primary Language</label>
                        <select value={lang} onChange={e => setLang(e.target.value)} required
                            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                            <option value="en">English</option>
                            <option value="te">Telugu</option>
                            <option value="hi">Hindi</option>
                            <option value="ta">Tamil</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={loading}
                            style={{ padding: '10px 16px', background: loading ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
