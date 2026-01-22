import { useEffect, useState } from 'react';

type Program = {
  id: string;
  title: string;
  description?: string;
  language_primary: string;
  status: string;
  assets?: {
    posters?: Record<string, Record<string, string>>;
  };
};

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

type Lesson = {
  id: string;
  term_id: string;
  lesson_number: number;
  title: string;
  status: string;
  publish_at?: string | null;
  published_at?: string | null;
  content_type: string;
  is_paid: boolean;
  content_language_primary: string;
};

function LoginView(props: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('editor@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Login failed');
        setLoading(false);
        return;
      }
      props.onLogin(data.access_token);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Mini CMS</h1>
      <p style={{ marginBottom: 24, color: '#555' }}>Login to manage programs, terms, and lessons.</p>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          borderRadius: 8,
          border: '1px solid #ddd',
          background: '#fafafa'
        }}
      >
        <label style={{ fontSize: 14 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginTop: 4,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginTop: 4,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
        </label>
        {error && (
          <div style={{ color: '#b00020', fontSize: 13 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 4,
            border: 'none',
            background: loading ? '#999' : '#2563eb',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer'
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div style={{ fontSize: 12, color: '#777', marginTop: 8 }}>
          Demo users: <code>admin@example.com</code>, <code>editor@example.com</code>,{' '}
          <code>viewer@example.com</code> (all with <code>password123</code>).
        </div>
      </form>
    </div>
  );
}

function LessonEditor(props: {
  token: string;
  lesson?: Lesson;
  termId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !props.lesson;
  const [title, setTitle] = useState(props.lesson?.title ?? '');
  const [lessonNumber, setLessonNumber] = useState(props.lesson?.lesson_number ?? 1);
  const [contentType, setContentType] = useState<'video' | 'article'>(
    (props.lesson?.content_type as any) ?? 'video'
  );
  const [durationMs, setDurationMs] = useState(props.lesson?.content_type === 'video' ? 300000 : 0);
  const [contentUrl, setContentUrl] = useState('https://example.com/video/demo');
  const [statusAction, setStatusAction] = useState<'stay_draft' | 'publish_now' | 'schedule'>(
    'stay_draft'
  );
  const [scheduleAt, setScheduleAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveLesson() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        term_id: props.termId,
        lesson_number: Number(lessonNumber),
        title,
        content_type: contentType,
        duration_ms: contentType === 'video' ? Number(durationMs) : null,
        is_paid: false,
        content_language_primary: 'en',
        content_languages_available: ['en'],
        content_url_primary: contentUrl
      };

      const url = isNew
        ? `${apiBase}/cms/lessons`
        : `${apiBase}/cms/lessons/${props.lesson!.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${props.token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Failed to save lesson');
        setSaving(false);
        return;
      }

      const savedLesson: Lesson = data.lesson;

      if (statusAction !== 'stay_draft') {
        const statusRes = await fetch(`${apiBase}/cms/lessons/${savedLesson.id}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${props.token}`
          },
          body: JSON.stringify({
            action: statusAction === 'publish_now' ? 'publish_now' : 'schedule',
            publish_at: statusAction === 'schedule' ? scheduleAt : undefined
          })
        });
        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          setError(statusData?.message || 'Failed to change status');
          setSaving(false);
          return;
        }
      }

      props.onSaved();
      props.onClose();
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(15,23,42,0.25)',
          padding: 20,
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>
          {isNew ? 'Create lesson' : 'Edit lesson'}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>
          For demo, we support a simple single-language video/article with optional scheduling.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <label style={{ fontSize: 14 }}>
            Lesson title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                marginTop: 4,
                borderRadius: 4,
                border: '1px solid #d1d5db'
              }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Lesson number
            <input
              type="number"
              min={1}
              value={lessonNumber}
              onChange={(e) => setLessonNumber(Number(e.target.value))}
              style={{
                width: '100%',
                padding: 8,
                marginTop: 4,
                borderRadius: 4,
                border: '1px solid #d1d5db'
              }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Content type
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'video' | 'article')}
              style={{
                width: '100%',
                padding: 8,
                marginTop: 4,
                borderRadius: 4,
                border: '1px solid #d1d5db'
              }}
            >
              <option value="video">Video</option>
              <option value="article">Article</option>
            </select>
          </label>

          {contentType === 'video' && (
            <label style={{ fontSize: 14 }}>
              Duration (ms)
              <input
                type="number"
                min={1}
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 4,
                  borderRadius: 4,
                  border: '1px solid #d1d5db'
                }}
              />
            </label>
          )}

          <label style={{ fontSize: 14 }}>
            Primary content URL (en)
            <input
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                marginTop: 4,
                borderRadius: 4,
                border: '1px solid #d1d5db'
              }}
            />
          </label>

          <fieldset
            style={{
              marginTop: 8,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              padding: 10
            }}
          >
            <legend style={{ fontSize: 13, padding: '0 4px', color: '#4b5563' }}>
              Status after save
            </legend>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              <input
                type="radio"
                name="statusAction"
                value="stay_draft"
                checked={statusAction === 'stay_draft'}
                onChange={() => setStatusAction('stay_draft')}
              />{' '}
              Stay in draft
            </label>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              <input
                type="radio"
                name="statusAction"
                value="publish_now"
                checked={statusAction === 'publish_now'}
                onChange={() => setStatusAction('publish_now')}
              />{' '}
              Publish now
            </label>
            <label style={{ display: 'block', fontSize: 13 }}>
              <input
                type="radio"
                name="statusAction"
                value="schedule"
                checked={statusAction === 'schedule'}
                onChange={() => setStatusAction('schedule')}
              />{' '}
              Schedule
            </label>
            {statusAction === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                style={{
                  marginTop: 6,
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #d1d5db'
                }}
              />
            )}
          </fieldset>

          {error && <div style={{ color: '#b00020', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={props.onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveLesson}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                border: 'none',
                background: saving ? '#9ca3af' : '#2563eb',
                color: '#fff',
                fontWeight: 600,
                cursor: saving ? 'default' : 'pointer'
              }}
            >
              {saving ? 'Saving…' : 'Save lesson'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramsView(props: { token: string; onLogout: () => void }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/cms/programs`, {
          headers: { Authorization: `Bearer ${props.token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message || 'Failed to load programs');
          return;
        }
        if (!cancelled) {
          setPrograms(data.programs ?? []);
        }
      } catch (err) {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Programs</h1>
        <button
          onClick={props.onLogout}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: '1px solid #ddd',
            background: '#f9fafb',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <p style={{ color: '#555', marginTop: 8 }}>
        API base: <code>{apiBase}</code>
      </p>

      {loading && <p>Loading programs…</p>}
      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16
        }}
      >
        {programs.map((p) => {
          const posters = p.assets?.posters ?? {};
          const primaryPosters = posters[p.language_primary] ?? {};
          const portraitUrl = primaryPosters.portrait;

          return (
            <div
              key={p.id}
              style={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={p.title}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 140,
                    background:
                      'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: 13
                  }}
                >
                  No poster
                </div>
              )}
              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>{p.title}</h2>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid #e5e7eb',
                      textTransform: 'uppercase',
                      letterSpacing: 0.04,
                      background: p.status === 'published' ? '#dcfce7' : '#f3f4f6'
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 8px' }}>
                  {p.description || 'No description'}
                </p>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>
                    Primary language: <strong>{p.language_primary}</strong>
                  </span>
                  {/* Demo: simple "add lesson" opens editor for this program's first term */}
                  <button
                    type="button"
                    onClick={async () => {
                      // simple: fetch program detail to get first term id, then open editor
                      const res = await fetch(`${apiBase}/cms/programs/${p.id}`, {
                        headers: { Authorization: `Bearer ${props.token}` }
                      });
                      const data = await res.json();
                      const firstTerm = (data.terms ?? [])[0];
                      if (!firstTerm) {
                        alert('No terms yet for this program (term creation UI not implemented).');
                        return;
                      }
                      (window as any).__openLessonEditor__({
                        termId: firstTerm.id
                      });
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                      cursor: 'pointer'
                    }}
                  >
                    + Lesson
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState<string | null>(() => {
    return window.localStorage.getItem('access_token');
  });
  const [lessonEditorArgs, setLessonEditorArgs] = useState<null | { termId: string }>(null);

  // expose a simple hook for the card "+ Lesson" button
  useEffect(() => {
    (window as any).__openLessonEditor__ = (args: { termId: string }) => {
      setLessonEditorArgs(args);
    };
  }, []);

  function handleLogin(newToken: string) {
    window.localStorage.setItem('access_token', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    window.localStorage.removeItem('access_token');
    setToken(null);
  }

  if (!token) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <>
      <ProgramsView token={token} onLogout={handleLogout} />
      {lessonEditorArgs && (
        <LessonEditor
          token={token}
          termId={lessonEditorArgs.termId}
          onClose={() => setLessonEditorArgs(null)}
          onSaved={() => {
            // no-op for now; programs list auto-reflects via status only indirectly
          }}
        />
      )}
    </>
  );
}

