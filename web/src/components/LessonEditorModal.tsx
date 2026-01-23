import { useState } from 'react';
import { api } from '../api';
import { Lesson } from '../types';
import { AssetManager } from './AssetManager';

interface LessonEditorModalProps {
    lesson: Lesson | null;
    termId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function LessonEditorModal({ lesson, termId, onClose, onSuccess }: LessonEditorModalProps) {
    const isNew = !lesson;
    const [title, setTitle] = useState(lesson?.title || '');
    const [lessonNum, setLessonNum] = useState(lesson?.lesson_number || 1);
    const [contentType, setContentType] = useState(lesson?.content_type || 'video');
    const [duration, setDuration] = useState(lesson?.duration_ms || 300000);
    const [isPaid, setIsPaid] = useState(lesson?.is_paid || false);

    // Content URLs management
    const [contentLang, setContentLang] = useState('en');
    const [contentUrlPrimary, setContentUrlPrimary] = useState(
        lesson?.content_urls_by_language?.['en'] || 'https://example.com/video'
    );

    const [action, setAction] = useState('stay_draft');
    const [scheduleAt, setScheduleAt] = useState('');
    const [loading, setLoading] = useState(false);

    // Asset Manager refresh trigger
    const [refreshAssets, setRefreshAssets] = useState(0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const body = {
                term_id: termId,
                lesson_number: Number(lessonNum),
                title,
                content_type: contentType,
                duration_ms: contentType === 'video' ? Number(duration) : null,
                is_paid: isPaid,
                content_language_primary: contentLang, // Simplified: assuming primary is always the one edited here
                content_languages_available: [contentLang],
                content_urls_by_language: { [contentLang]: contentUrlPrimary }
            };

            const url = isNew ? '/cms/lessons' : `/cms/lessons/${lesson.id}`;
            const method = isNew ? 'POST' : 'PATCH';
            const data = await api.call(url, { method, body: JSON.stringify(body) });

            if (action !== 'stay_draft') {
                const lessonId = data.lesson.id;
                await api.call(`/cms/lessons/${lessonId}/status`, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: action === 'publish_now' ? 'publish_now' : 'schedule',
                        publish_at: action === 'schedule' ? scheduleAt : undefined
                    })
                });
            }

            onSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ width: 600, background: '#fff', borderRadius: 10, padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>{isNew ? 'Create' : 'Edit'} Lesson</h2>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} required
                                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No.</label>
                            <input type="number" min={1} value={lessonNum} onChange={e => setLessonNum(Number(e.target.value))} required
                                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Type</label>
                            <select value={contentType} onChange={e => setContentType(e.target.value as any)}
                                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                                <option value="video">Video</option>
                                <option value="article">Article</option>
                            </select>
                        </div>
                        {contentType === 'video' && (
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Duration (ms)</label>
                                <input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))}
                                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ fontSize: 13, fontWeight: 500, userSelect: 'none', cursor: 'pointer' }}>
                                <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} style={{ marginRight: 8 }} />
                                Paid Content
                            </label>
                        </div>
                    </div>

                    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Content URL (Primary)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 }}>
                            <select value={contentLang} onChange={e => setContentLang(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                                <option value="en">en</option>
                                <option value="te">te</option>
                                <option value="hi">hi</option>
                                <option value="ta">ta</option>
                            </select>
                            <input value={contentUrlPrimary} onChange={e => setContentUrlPrimary(e.target.value)} placeholder="https://..."
                                style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db' }} />
                        </div>
                    </div>

                    {!isNew && lesson && (
                        <AssetManager
                            entityId={lesson.id}
                            entityType="lesson"
                            assets={lesson.assets?.thumbnails || {}}
                            onChanged={() => setRefreshAssets(p => p + 1)} // Parent would need to reload really, but for now we just rely on parent reload
                            languages={[contentLang]}
                            allowedVariants={['portrait', 'landscape', 'square', 'banner']}
                        />
                    )}

                    <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                        <legend style={{ fontSize: 13, padding: '0 6px' }}>Status after save</legend>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13 }}>
                                <input type="radio" name="action" value="stay_draft" checked={action === 'stay_draft'} onChange={e => setAction(e.target.value)} /> Stay in draft
                            </label>
                            <label style={{ fontSize: 13 }}>
                                <input type="radio" name="action" value="publish_now" checked={action === 'publish_now'} onChange={e => setAction(e.target.value)} /> Publish now
                            </label>
                            <label style={{ fontSize: 13 }}>
                                <input type="radio" name="action" value="schedule" checked={action === 'schedule'} onChange={e => setAction(e.target.value)} /> Schedule
                            </label>
                            {action === 'schedule' && (
                                <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                                    style={{ marginLeft: 20, padding: '6px', borderRadius: 4, border: '1px solid #d1d5db' }} />
                            )}
                        </div>
                    </fieldset>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={loading}
                            style={{ padding: '10px 16px', background: loading ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
