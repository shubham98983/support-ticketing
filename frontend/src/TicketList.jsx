import { useEffect, useState } from 'react';
import { api } from './api';

function StatusPill({ status }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}
function PriorityPill({ priority }) {
  return <span className={`pill pill-${priority}`}>{priority}</span>;
}

export function TicketList({ user, onSelectTicket }) {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', category: '' });
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 10;

  async function load() {
    try {
      const params = { ...filters, sort, order, page, pageSize };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const result = await api.getTickets(params);
      setTickets(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, order, page]);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleBulkClose() {
    const results = await api.bulkClose([...selected]);
    reportBulkResults(results);
    setSelected(new Set());
    load();
  }

  async function handleBulkReassign() {
    const agentId = prompt('Reassign selected tickets to which agent id?\n' + users.map((u) => `${u.id}: ${u.name}`).join('\n'));
    if (!agentId) return;
    const results = await api.bulkReassign([...selected], Number(agentId));
    reportBulkResults(results);
    setSelected(new Set());
    load();
  }

  function reportBulkResults({ results }) {
    const lines = results.map((r) => `#${r.ticketId}: ${r.ok ? 'OK' : 'FAILED - ' + r.reason}`);
    alert(lines.join('\n'));
  }

  const isAgent = user.role === 'agent';
  const myTickets = isAgent ? tickets.filter((t) => t.primary_assignee_id === user.id) : tickets;
  const collabTickets = isAgent ? tickets.filter((t) => t.primary_assignee_id !== user.id) : [];

  function renderRow(t) {
    return (
      <tr key={t.id} className="ticket-row" onClick={() => onSelectTicket(t.id)}>
        {user.role === 'supervisor' && (
          <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
          </td>
        )}
        <td>#{t.id} {t.subject}</td>
        <td><StatusPill status={t.status} /></td>
        <td><PriorityPill priority={t.priority} /></td>
        <td>{t.category}</td>
        <td>{new Date(t.created_at).toLocaleDateString()}</td>
      </tr>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>Tickets</h2>
        <div>
          <a href={`http://localhost:3000/tickets/export.csv?${new URLSearchParams(filters).toString()}`}
             target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
            Export CSV
          </a>
          <button className="primary" onClick={() => setShowCreate(true)}>+ New Ticket</button>
        </div>
      </div>

      {showCreate && <CreateTicketForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="filters">
        <input placeholder="Search subject/description..." value={filters.q}
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
      </div>

      {user.role === 'supervisor' && selected.size > 0 && (
        <div className="card">
          {selected.size} selected —{' '}
          <button className="secondary" onClick={handleBulkReassign}>Bulk Reassign</button>{' '}
          <button className="secondary" onClick={handleBulkClose}>Bulk Close</button>
        </div>
      )}

      {isAgent ? (
        <>
          <div className="card">
            <h3>My Tickets ({myTickets.length})</h3>
            <table><tbody>{myTickets.map(renderRow)}</tbody></table>
          </div>
          <div className="card">
            <h3>Collaborating On ({collabTickets.length})</h3>
            <table><tbody>{collabTickets.map(renderRow)}</tbody></table>
          </div>
        </>
      ) : (
        <div className="card">
          <table><tbody>{tickets.map(renderRow)}</tbody></table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{total} total</span>
        <div>
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>{' '}
          <span>Page {page}</span>{' '}
          <button className="secondary" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

function CreateTicketForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ subject: '', description: '', requesterName: '', requesterEmail: '', priority: 'normal', category: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.createTicket(form);
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h3>New Ticket</h3>
      <form onSubmit={handleSubmit}>
        <div className="filters">
          <input placeholder="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input placeholder="Requester name" required value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} />
          <input placeholder="Requester email" required value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} />
          <input placeholder="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <textarea placeholder="Description" style={{ width: '100%', padding: 8, marginBottom: 8 }} rows={3}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button className="primary" type="submit">Create</button>{' '}
        <button className="secondary" type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}
