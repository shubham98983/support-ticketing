import { useEffect, useState } from 'react';
import { api } from './api';

export function Alerts({ onSelectTicket }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAcknowledge(ticketId, e) {
    e.stopPropagation();
    try {
      await api.acknowledgeAlert(ticketId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h2>Alerts</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {alerts.length === 0 && <div className="card">No active alerts. Nothing is breaching or at risk right now.</div>}
      {alerts.map((a) => (
        <div key={a.id} className="card ticket-row" onClick={() => onSelectTicket(a.id)}
             style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>#{a.id} {a.subject}</strong>{' '}
            <span className={`pill ${a.slaStatus === 'breaching' ? 'pill-urgent' : 'pill-high'}`}>
              {a.slaStatus === 'breaching' ? 'BREACHING' : 'AT RISK'}
            </span>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              <span className={`pill pill-${a.status}`}>{a.status}</span> &middot; {a.priority} priority
            </div>
          </div>
          <button className="secondary" onClick={(e) => handleAcknowledge(a.id, e)}>Acknowledge</button>
        </div>
      ))}
    </div>
  );
}
