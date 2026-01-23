import { useState } from 'react';
import { api } from '../api';

interface AssetManagerProps {
    entityId: string;
    entityType: 'program' | 'lesson';
    assets: Record<string, Record<string, string>>; // language -> variant -> url
    onChanged: () => void;
    allowedVariants: string[];
    languages: string[];
}

export function AssetManager({ entityId, entityType, assets, onChanged, allowedVariants, languages }: AssetManagerProps) {
    const [loading, setLoading] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [selectedLang, setSelectedLang] = useState(languages[0] || 'en');
    const [selectedVariant, setSelectedVariant] = useState(allowedVariants[0]);

    const handleSave = async () => {
        if (!newUrl) return;
        setLoading(true);
        try {
            const endpoint = entityType === 'program'
                ? `/cms/programs/${entityId}/assets`
                : `/cms/lessons/${entityId}/assets`;

            const body: any = {
                language: selectedLang,
                variant: selectedVariant,
                url: newUrl
            };

            if (entityType === 'lesson') {
                // Assume all lesson assets via this manager are thumbnails for now
                body.asset_type = 'thumbnail';
            }

            await api.call(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            setNewUrl('');
            onChanged();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (lang: string, variant: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            const endpoint = entityType === 'program'
                ? `/cms/programs/${entityId}/assets`
                : `/cms/lessons/${entityId}/assets`;

            const body: any = { language: lang, variant };
            if (entityType === 'lesson') {
                body.asset_type = 'thumbnail';
            }

            await api.call(endpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            onChanged();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Assets (Posters/Thumbnails)</h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Language</label>
                    <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
                        style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Variant</label>
                    <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
                        style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                        {allowedVariants.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Image URL</label>
                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."
                        style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                </div>
                <button onClick={handleSave} disabled={loading || !newUrl}
                    style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', height: 34 }}>
                    {loading ? 'Saving...' : 'Add'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {Object.entries(assets || {}).flatMap(([lang, variants]) =>
                    Object.entries(variants).map(([variant, url]) => (
                        <div key={`${lang}-${variant}`} style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <img src={url} alt={`${lang} ${variant}`} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                            <div style={{ padding: 8, fontSize: 11, background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                <div><strong>{lang}</strong> • {variant}</div>
                            </div>
                            <button onClick={() => handleDelete(lang, variant)}
                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#dc2626', fontSize: 10 }}>
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
