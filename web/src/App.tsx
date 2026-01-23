import { useState, useEffect } from 'react';
import { User } from './types';
import { Login } from './screens/Login';
import { ProgramsList } from './screens/ProgramsList';
import { ProgramDetail } from './screens/ProgramDetail';
import { jwtDecode } from 'jwt-decode';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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
