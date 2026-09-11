import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}
function PriorityPill({ priority }) {
  return <span className={`pill pill-${priority}`}>{priority}</span>;
}

export function TicketList({ user }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', category: '', archived: '' });
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  async function load() {
    try {
      setLoading(true);
      const params = { ...filters, sort, order, page, pageSize };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const result = await api.getTickets(params);
      setTickets(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, order, page]);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  // Clear selection when filters change
  useEffect(() => {
    setSelected(new Set());
  }, [filters, sort, order, page]);

  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleBulkClose() {
    try {
      const results = await api.bulkClose([...selected]);
      reportBulkResults(results);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBulkReassign() {
    const agentId = prompt('Reassign selected tickets to which agent id?\n' + users.map((u) => `${u.id}: ${u.name}`).join('\n'));
    if (!agentId) return;
    const parsed = Number(agentId);
    if (Number.isNaN(parsed)) {
      setError('Invalid agent ID. Please enter a number.');
      return;
    }
    try {
      const results = await api.bulkReassign([...selected], parsed);
      reportBulkResults(results);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function reportBulkResults({ results }) {
    const lines = results.map((r) => `#${r.ticketId}: ${r.ok ? '✓ OK' : '✗ FAILED — ' + r.reason}`);
    alert(lines.join('\n'));
  }

  async function handleExportCSV() {
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`http://localhost:3000/tickets/export.csv${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tickets.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestore(id) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/tickets/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Restore failed');
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const showArchivedCol = filters.archived === 'true';
  const isAgent = user.role === 'agent';
  const myTickets = isAgent ? tickets.filter((t) => t.primary_assignee_id === user.id) : tickets;
  const collabTickets = isAgent ? tickets.filter((t) => t.primary_assignee_id !== user.id) : [];

  function renderRow(t) {
    return (
      <tr key={t.id} className="ticket-row" onClick={() => navigate(`/tickets/${t.id}`)}>
        {user.role === 'supervisor' && (
          <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
          </td>
        )}
        <td>
          <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>#{t.id}</span>
          {t.subject}
        </td>
        <td><StatusPill status={t.status} /></td>
        <td><PriorityPill priority={t.priority} /></td>
        <td style={{ color: 'var(--text-secondary)' }}>{t.category}</td>
        <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleDateString()}</td>
        {showArchivedCol && (
          <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleRestore(t.id)}>Restore</button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tickets</h2>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            ↓ Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            + New Ticket
          </button>
        </div>
      </div>

      {showCreate && <CreateTicketForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>✕</button></div>}

      <div className="filters">
        <input placeholder="Search subject / description…" value={filters.q}
               onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }} />
        <select value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }); }}>
          <option value="">All statuses</option>
          {['New', 'Open', 'Pending', 'Resolved', 'Closed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => { setPage(1); setFilters({ ...filters, priority: e.target.value }); }}>
          <option value="">All priorities</option>
          {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created_at">Sort: Created</option>
          <option value="updated_at">Sort: Updated</option>
          <option value="priority">Sort: Priority</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, flex: '0 0 auto', width: 'fit-content', whiteSpace: 'nowrap' }}>
          <input
            id="show-archived-checkbox"
            type="checkbox"
            checked={filters.archived === 'true'}
            onChange={(e) => { setPage(1); setFilters({ ...filters, archived: e.target.checked ? 'true' : '' }); }}
            style={{ width: 'auto', flex: '0 0 auto', margin: 0 }}
          />
          <label htmlFor="show-archived-checkbox" style={{ display: 'inline', width: 'auto' }}>Show archived</label>
        </div>
      </div>

      {user.role === 'supervisor' && selected.size > 0 && (
        <div className="bulk-bar">
          <span>{selected.size} selected</span>
          <button className="btn btn-secondary btn-sm" onClick={handleBulkReassign}>Reassign</button>
          <button className="btn btn-secondary btn-sm" onClick={handleBulkClose}>Close</button>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading tickets…</div>
      ) : isAgent ? (
        <>
          <div className="card">
            <h3>My Tickets ({myTickets.length})</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ticket</th><th>Status</th><th>Priority</th><th>Category</th><th>Created</th>{showArchivedCol && <th></th>}</tr></thead>
                <tbody>
                  {myTickets.map(renderRow)}
                  {myTickets.length === 0 && <tr><td colSpan={showArchivedCol ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No tickets assigned to you</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3>Collaborating On ({collabTickets.length})</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ticket</th><th>Status</th><th>Priority</th><th>Category</th><th>Created</th>{showArchivedCol && <th></th>}</tr></thead>
                <tbody>
                  {collabTickets.map(renderRow)}
                  {collabTickets.length === 0 && <tr><td colSpan={showArchivedCol ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Not collaborating on any tickets</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr>{user.role === 'supervisor' && <th style={{ width: 36 }}></th>}<th>Ticket</th><th>Status</th><th>Priority</th><th>Category</th><th>Created</th>{showArchivedCol && <th></th>}</tr></thead>
              <tbody>
                {tickets.map(renderRow)}
                {tickets.length === 0 && <tr><td colSpan={(user.role === 'supervisor' ? 6 : 5) + (showArchivedCol ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No tickets found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pagination">
        <span>{total} total ticket{total !== 1 ? 's' : ''}</span>
        <div className="pagination-controls">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button className="btn btn-secondary btn-sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function CreateTicketForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ subject: '', description: '', requesterName: '', requesterEmail: '', priority: 'normal', category: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.createTicket(form);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-form">
      <h3>New Ticket</h3>
      <form onSubmit={handleSubmit}>
        <div className="filters" style={{ marginBottom: 12 }}>
          <input placeholder="Subject *" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={200} />
          <input placeholder="Requester name *" required value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} maxLength={100} />
          <input placeholder="Requester email *" type="email" required value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} maxLength={200} />
          <input placeholder="Category *" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={50} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <textarea placeholder="Description…" rows={3} style={{ marginBottom: 12 }}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={5000} />
        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
