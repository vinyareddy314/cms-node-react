import { useState, useEffect } from 'react';
import { User } from './types';
import { Login } from './screens/Login';
import { ProgramsList } from './screens/ProgramsList';
import { ProgramDetail } from './screens/ProgramDetail';
import { UsersList } from './screens/UsersList';
import { jwtDecode } from 'jwt-decode';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'programs' | 'users'>('programs');
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        // Map JWT claims to User object
        setUser({
          id: decoded.sub || decoded.id,
          email: decoded.email,
          role: decoded.role || 'editor'
        });
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActiveTab('programs');
    setSelectedProgram(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Simple Router
  if (selectedProgram) {
    return <ProgramDetail programId={selectedProgram} user={user} onBack={() => setSelectedProgram(null)} />;
  }

  // Admin View with Tabs
  if (user.role === 'admin') {
    if (activeTab === 'users') {
      return (
        <>
          <AdminNav active="users" onChange={setActiveTab} />
          <UsersList user={user} onLogout={handleLogout} />
        </>
      );
    }
    return (
      <>
        <AdminNav active="programs" onChange={setActiveTab} />
        <ProgramsList user={user} onSelect={setSelectedProgram} onLogout={handleLogout} />
      </>
    );
  }

  // Standard View (Editor/Viewer)
  return <ProgramsList user={user} onSelect={setSelectedProgram} onLogout={handleLogout} />;
}

function AdminNav({ active, onChange }: { active: 'programs' | 'users', onChange: (tab: 'programs' | 'users') => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 32 }}>
        <button onClick={() => onChange('programs')}
          style={{
            padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 500,
            color: active === 'programs' ? '#2563eb' : '#6b7280',
            borderBottom: active === 'programs' ? '2px solid #2563eb' : '2px solid transparent'
          }}>
          Programs
        </button>
        <button onClick={() => onChange('users')}
          style={{
            padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 500,
            color: active === 'users' ? '#2563eb' : '#6b7280',
            borderBottom: active === 'users' ? '2px solid #2563eb' : '2px solid transparent'
          }}>
          Users
        </button>
      </div>
    </div>
  );
}
