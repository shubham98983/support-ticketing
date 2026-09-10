import { useEffect, useState } from 'react';
import { api } from './api';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page"><p style={{ color: 'red' }}>{error}</p></div>;
  if (!data) return <div className="page">Loading...</div>;

  const maxWeekCount = Math.max(...data.resolvedPerWeek.map((w) => w.count), 1);

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <div className="grid-4">
        <StatCard label="Open" value={data.openCount} />
        <StatCard label="Pending (on customer)" value={data.pendingCount} />
        <StatCard label="Resolved this week" value={data.resolvedThisWeek} />
        <StatCard label="Breaching SLA" value={data.breachingCount} highlight={data.breachingCount > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <h3>By Status</h3>
          <table><tbody>
            {Object.entries(data.byStatus).map(([status, count]) => (
              <tr key={status}><td><span className={`pill pill-${status}`}>{status}</span></td><td>{count}</td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="card">
          <h3>By Agent</h3>
          <table><tbody>
            {Object.entries(data.byAgent).map(([name, count]) => (
              <tr key={name}><td>{name}</td><td>{count}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>

      <div className="card">
        <h3>Resolved per week (last 8 weeks)</h3>
        <div className="bar-chart">
          {data.resolvedPerWeek.map((w) => (
            <div key={w.weekStart} style={{ flex: 1, textAlign: 'center' }}>
              <div className="bar" style={{ height: `${(w.count / maxWeekCount) * 90}px` }} title={`${w.count} resolved`} />
              <div className="bar-label">{w.weekStart.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="card">
      <div className="stat-number" style={{ color: highlight ? '#dc2626' : '#1a1a1a' }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
