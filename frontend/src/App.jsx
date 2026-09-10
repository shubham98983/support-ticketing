import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import { Login } from './Login';
import { NavBar } from './NavBar';
import { TicketList } from './TicketList';
import { TicketDetail } from './TicketDetail';
import { Dashboard } from './Dashboard';
import { Alerts } from './Alerts';
import { clearToken, restoreUser, setOnUnauthorized } from './api';

function App() {
  const [user, setUser] = useState(() => restoreUser());
  const navigate = useNavigate();
  const location = useLocation();

  // Register 401 handler to auto-logout on expired token
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  function handleLogout() {
    clearToken();
    setUser(null);
    navigate('/login', { replace: true });
  }

  function handleLogin(u) {
    setUser(u);
    navigate('/dashboard', { replace: true });
  }

  // If not logged in, only allow /login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <div className="app-content">
        <NavBar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList user={user} />} />
          <Route path="/tickets/:id" element={<TicketDetail user={user} />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
