import { useEffect, useState } from 'react';
import { api } from './api';

export function NavBar({ view, setView, user, onLogout }) {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      try {
        const { total } = await api.getAlerts();
        if (!cancelled) setAlertCount(total);
      } catch {
        // silently ignore — nav badge isn't worth surfacing an error for
      }
    }
    loadCount();
    const interval = setInterval(loadCount, 15000); // refresh every 15s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view]); // re-check whenever the user switches views, e.g. after acknowledging

  return (
    <div className="nav">
      <h1>Support Ticketing</h1>
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
        Dashboard
      </button>
      <button className={view === 'tickets' ? 'active' : ''} onClick={() => setView('tickets')}>
        Tickets
      </button>
      <button className={view === 'alerts' ? 'active' : ''} onClick={() => setView('alerts')}>
        Alerts
        {alertCount > 0 && <span className="badge">{alertCount}</span>}
      </button>
      <span style={{ fontSize: 13, color: '#9ca3af' }}>
        {user.name} ({user.role})
      </span>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}
