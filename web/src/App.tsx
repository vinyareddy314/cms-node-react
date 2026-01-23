import { useState, useEffect } from 'react';
import { User } from './types';
import { Login } from './screens/Login';
import { ProgramsList } from './screens/ProgramsList';
import { ProgramDetail } from './screens/ProgramDetail';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Ideally we should validate token or fetch user profile here
      setUser({ id: 'cached', email: 'cached@user.com', role: 'editor' });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSelectedProgram(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (selectedProgram) {
    return <ProgramDetail programId={selectedProgram} user={user} onBack={() => setSelectedProgram(null)} />;
  }

  return <ProgramsList user={user} onSelect={setSelectedProgram} onLogout={handleLogout} />;
}
