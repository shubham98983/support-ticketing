import { useEffect, useState } from 'react';
import { api } from './api';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p className="text-danger" style={{ margin: '0 0 12px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => { setError(''); api.getDashboard().then(setData).catch((err) => setError(err.message)); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="page"><div className="loading"><div className="spinner" /> Loading dashboard…</div></div>;
  }

  const maxWeekCount = Math.max(...data.resolvedPerWeek.map((w) => w.count), 1);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon blue">📂</div>
          <div className="stat-number">{data.openCount}</div>
          <div className="stat-label">Open tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⏳</div>
          <div className="stat-number">{data.pendingCount}</div>
          <div className="stat-label">Pending on customer</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-number">{data.resolvedThisWeek}</div>
          <div className="stat-label">Resolved this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚨</div>
          <div className={`stat-number ${data.breachingCount > 0 ? 'danger' : ''}`}>{data.breachingCount}</div>
          <div className="stat-label">Breaching SLA</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>By Status</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td><span className={`pill pill-${status}`}>{status}</span></td>
                    <td style={{ fontWeight: 600 }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>By Agent</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {Object.entries(data.byAgent).map(([name, count]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{ fontWeight: 600 }}>{count}</td>
                  </tr>
                ))}
                {Object.keys(data.byAgent).length === 0 && (
                  <tr><td colSpan={2} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No assigned tickets</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Resolved per week (last 8 weeks)</h3>
        <div className="bar-chart">
          {data.resolvedPerWeek.map((w) => (
            <div key={w.weekStart} className="bar-column">
              <span className="bar-count">{w.count || ''}</span>
              <div className="bar" style={{ height: `${Math.max((w.count / maxWeekCount) * 90, 3)}px` }} title={`${w.count} resolved`} />
              <div className="bar-label">{w.weekStart.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
