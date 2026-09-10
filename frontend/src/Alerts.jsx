import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

export function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      <div className="page-header">
        <h2>Alerts</h2>
      </div>

      {error && <div className="login-error mb-4">{error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>✕</button></div>}

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <p>No active alerts. Nothing is breaching or at risk right now.</p>
          </div>
        </div>
      ) : (
        alerts.map((a) => (
          <div
            key={a.id}
            className={`alert-card ${a.slaStatus === 'breaching' ? 'breaching' : 'at-risk'}`}
            onClick={() => navigate(`/tickets/${a.id}`)}
          >
            <div className="alert-info">
              <h4>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>#{a.id}</span>{' '}
                {a.subject}
              </h4>
              <div className="alert-meta">
                <span className={`pill ${a.slaStatus === 'breaching' ? 'pill-urgent' : 'pill-high'}`}>
                  {a.slaStatus === 'breaching' ? '🔴 BREACHING' : '🟡 AT RISK'}
                </span>
                <span className={`pill pill-${a.status}`}>{a.status}</span>
                <span>{a.priority} priority</span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={(e) => handleAcknowledge(a.id, e)}>
              Acknowledge
            </button>
          </div>
        ))
      )}
    </div>
  );
}
