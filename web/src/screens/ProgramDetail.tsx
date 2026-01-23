import { useState, useEffect } from 'react';
import { api } from '../api';
import { Program, User, Lesson } from '../types';
import { AssetManager } from '../components/AssetManager';
import { LessonEditorModal } from '../components/LessonEditorModal';

interface ProgramDetailProps {
    programId: string;
    user: User;
    onBack: () => void;
}

export function ProgramDetail({ programId, user, onBack }: ProgramDetailProps) {
    const [program, setProgram] = useState<Program | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'lessons' | 'terms' | 'info'>('lessons');

    // Lesson modal state
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [editLesson, setEditLesson] = useState<Lesson | null>(null);
    const [activeTermId, setActiveTermId] = useState('');

    // Editing logic for Info tab
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editLang, setEditLang] = useState('');

    useEffect(() => { loadProgram(); }, [programId]);

    const loadProgram = async () => {
        try {
            const data = await api.call(`/cms/programs/${programId}`);
            setProgram(data.program); // API returns { program: ..., terms: ..., lessons: ... }
            // Wait, API struct is res.json({ program: { ...program, topics, assets }, terms, lessons })
            // So data.program is the program object.
            // We need to merge terms and lessons into program object for easier handling or store separately.
            // My type Program has optional terms and lessons.
            // Let's manually reconstruct the full object.
            const fullProgram = {
                ...data.program,
                terms: data.terms,
                lessons: data.lessons
            };
            setProgram(fullProgram);

            setEditTitle(fullProgram.title);
            setEditDesc(fullProgram.description);
            setEditLang(fullProgram.language_primary);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createTerm = async () => {
        try {
            if (!program) return;
            await api.call('/cms/terms', {
                method: 'POST',
                body: JSON.stringify({ program_id: programId, term_number: (program.terms?.length || 0) + 1, title: `Term ${(program.terms?.length || 0) + 1}` })
            });
            loadProgram();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const saveInfo = async () => {
        try {
            await api.call(`/cms/programs/${programId}`, {
                method: 'PATCH',
                body: JSON.stringify({ title: editTitle, description: editDesc, language_primary: editLang })
            });
            setIsEditingInfo(false);
            loadProgram();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading || !program) return <div style={{ padding: 24 }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: 24 }}>
                <button onClick={onBack} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', marginBottom: 16 }}>
                    ← Back
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>{program.title}</h1>
                        <p style={{ margin: '0 0 12px', color: '#6b7280' }}>{program.description}</p>
                    </div>
                    {user.role !== 'viewer' && tab === 'info' && (
                        <button onClick={() => setIsEditingInfo(!isEditingInfo)} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
                            {isEditingInfo ? 'Cancel Edit' : 'Edit Info'}
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{
                        padding: '4px 10px', borderRadius: 10, background: program.status === 'published' ? '#d1fae5' : '#f3f4f6',
                        color: program.status === 'published' ? '#065f46' : '#6b7280', fontWeight: 600
                    }}>{program.status}</span>
                    <span>Language: {program.language_primary}</span>
                    <span>Terms: {program.terms?.length}</span>
                    <span>Lessons: {program.lessons?.length}</span>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb' }}>
                    {(['lessons', 'terms', 'info'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            style={{
                                padding: '10px 18px', background: 'transparent', border: 'none',
                                borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                                color: tab === t ? '#2563eb' : '#6b7280', fontWeight: tab === t ? 600 : 400,
                                cursor: 'pointer', textTransform: 'capitalize', marginBottom: -2
                            }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ padding: 24 }}>
                {tab === 'info' && (
                    <div style={{ background: '#fff', padding: 20, borderRadius: 10 }}>
                        <h3 style={{ marginTop: 0 }}>Program Details</h3>
                        {isEditingInfo ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
                                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }} />
                                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }} />
                                <select value={editLang} onChange={e => setEditLang(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}>
                                    <option value="en">en</option>
                                    <option value="te">te</option>
                                </select>
                                <button onClick={saveInfo} style={{ padding: '8px', background: '#2563eb', color: '#fff', borderRadius: 4, border: 'none' }}>Save Changes</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, fontSize: 14 }}>
                                <strong>Created:</strong><span>{new Date(program.created_at).toLocaleString()}</span>
                                <strong>Updated:</strong><span>{new Date(program.updated_at).toLocaleString()}</span>
                                {program.published_at && <><strong>Published:</strong><span>{new Date(program.published_at).toLocaleString()}</span></>}
                            </div>
                        )}

                        <hr style={{ margin: '20px 0', borderTop: '1px solid #eee', borderBottom: 'none' }} />

                        <AssetManager
                            entityId={program.id}
                            entityType="program"
                            assets={program.assets?.posters || {}}
                            onChanged={loadProgram}
                            allowedVariants={['portrait', 'landscape', 'square', 'banner']}
                            languages={program.languages_available}
                        />
                    </div>
                )}

                {tab === 'terms' && (
                    <div>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Terms ({program.terms?.length})</h3>
                            {user.role !== 'viewer' && (
                                <button onClick={createTerm} style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                                    + Add Term
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {program.terms?.map(term => (
                                <div key={term.id} style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>Term {term.term_number}</strong>
                                        {term.title && <span style={{ marginLeft: 10, color: '#6b7280' }}>{term.title}</span>}
                                    </div>
                                    {user.role !== 'viewer' && (
                                        <button onClick={() => { setActiveTermId(term.id); setEditLesson(null); setShowLessonModal(true); }}
                                            style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                            + Add Lesson
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'lessons' && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>All Lessons ({program.lessons?.length})</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {program.lessons?.map(lesson => {
                                const term = program.terms?.find(t => t.id === lesson.term_id);
                                return (
                                    <div key={lesson.id} style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                                                    <h4 style={{ margin: 0, fontSize: 16 }}>{lesson.title}</h4>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                                                        background: lesson.status === 'published' ? '#d1fae5' : lesson.status === 'scheduled' ? '#fef3c7' : '#f3f4f6',
                                                        color: lesson.status === 'published' ? '#065f46' : lesson.status === 'scheduled' ? '#92400e' : '#6b7280'
                                                    }}>
                                                        {lesson.status}
                                                    </span>
                                                    {lesson.is_paid && <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 10, background: '#dbeafe', color: '#1e40af' }}>PAID</span>}
                                                </div>
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>
                                                    <div>Term {term?.term_number} • Lesson {lesson.lesson_number} • {lesson.content_type}</div>
                                                    {lesson.publish_at && <div style={{ marginTop: 4 }}>Scheduled: {new Date(lesson.publish_at).toLocaleString()}</div>}
                                                </div>
                                            </div>
                                            {user.role !== 'viewer' && (
                                                <button onClick={() => { setEditLesson(lesson); setActiveTermId(lesson.term_id); setShowLessonModal(true); }}
                                                    style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {showLessonModal && (
                <LessonEditorModal
                    lesson={editLesson}
                    termId={activeTermId}
                    onClose={() => setShowLessonModal(false)}
                    onSuccess={() => { setShowLessonModal(false); loadProgram(); }}
                />
            )}
        </div>
    );
}
