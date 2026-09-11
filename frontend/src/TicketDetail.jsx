import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from './api';

const VALID_NEXT_STATUSES = {
  New: ['Open'],
  Open: ['Pending', 'Resolved'],
  Pending: ['Open'],
  Resolved: ['Closed'],
  Closed: ['Open'],
};

export function TicketDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticketId = Number(id);

  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [users, setUsers] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [replyKind, setReplyKind] = useState('agent');
  const [error, setError] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [transitioning, setTransitioning] = useState('');
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  async function load() {
    try {
      const t = await api.getTicket(ticketId);
      setTicket(t);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    api.getUsers().then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function loadTimeline() {
    try {
      const events = await api.getTimeline(ticketId);
      setTimeline(events);
      setShowTimeline(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTransition(targetStatus) {
    setError('');
    setTransitioning(targetStatus);
    try {
      await api.transitionTicket(ticketId, targetStatus);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTransitioning('');
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyBody.trim() || replying) return;
    setError('');
    setReplying(true);
    try {
      await api.addReply(ticketId, {
        body: replyBody,
        isInternal: replyKind === 'internal',
        isCustomerReply: replyKind === 'customer',
      });
      setReplyBody('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplying(false);
    }
  }

  async function handleAddCollaborator() {
    const agentId = prompt('Add which agent as collaborator?\n' + users.map((u) => `${u.id}: ${u.name}`).join('\n'));
    if (!agentId) return;
    const parsed = Number(agentId);
    if (Number.isNaN(parsed)) {
      setError('Invalid agent ID.');
      return;
    }
    try {
      await api.addCollaborator(ticketId, parsed);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditing() {
    setEditForm({
      subject: ticket.subject,
      description: ticket.description || '',
      priority: ticket.priority,
      category: ticket.category,
    });
    setEditing(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.updateTicket(ticketId, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleArchiveToggle() {
    setError('');
    setArchiving(true);
    try {
      if (ticket.archived_at) {
        await api.restoreTicket(ticketId);
      } else {
        await api.archiveTicket(ticketId);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  }

  if (!ticket) {
    return (
      <div className="page">
        {error ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="text-danger" style={{ margin: '0 0 12px' }}>{error}</p>
            <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>← Back to tickets</button>
          </div>
        ) : (
          <div className="loading"><div className="spinner" /> Loading ticket…</div>
        )}
      </div>
    );
  }

  const nextStatuses = VALID_NEXT_STATUSES[ticket.status] || [];
  const isPending = ticket.status === 'Pending';
  const assignee = users.find(u => u.id === ticket.primary_assignee_id);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate('/tickets')} style={{ marginBottom: 16 }}>
        ← Back to tickets
      </button>

      <div className="card">
        {ticket.archived_at && (
          <div className="login-error mb-3">
            This ticket is archived and hidden from default queue views.
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSaveEdit}>
            <input
              style={{ width: '100%', marginBottom: 8, fontSize: 18, fontWeight: 600 }}
              value={editForm.subject}
              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
            />
            <textarea
              rows={3}
              style={{ width: '100%', marginBottom: 8 }}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <div className="detail-actions">
              <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
              <button className="btn btn-primary btn-sm" type="submit">Save</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="detail-header">
            <div>
              <h2>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>#{ticket.id}</span>{' '}
                {ticket.subject}
              </h2>
              <div className="detail-meta">
                Requester: <strong>{ticket.requester_name}</strong> ({ticket.requester_email})
                {' · '}Category: <strong>{ticket.category}</strong>
                {assignee && <>{' · '}Assigned to: <strong>{assignee.name}</strong></>}
              </div>
            </div>
            <div className="detail-pills">
              <span className={`pill pill-${ticket.status}`}>{ticket.status}</span>
              <span className={`pill pill-${ticket.priority}`}>{ticket.priority}</span>
            </div>
          </div>
        )}

        {!editing && ticket.description && (
          <div className="detail-desc">{ticket.description}</div>
        )}

        <div className="detail-actions">
          {!editing && !ticket.archived_at && nextStatuses.map((s) => (
            <button key={s} className="btn btn-secondary btn-sm"
                    disabled={transitioning === s}
                    onClick={() => handleTransition(s)}>
              {transitioning === s ? 'Moving…' : `Move to ${s}`}
            </button>
          ))}
          {!editing && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={startEditing}>Edit</button>
              <button className="btn btn-secondary btn-sm" onClick={handleAddCollaborator}>+ Collaborator</button>
              <button className="btn btn-ghost btn-sm" onClick={loadTimeline}>
                {showTimeline ? 'Refresh Timeline' : 'View Timeline'}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={archiving} onClick={handleArchiveToggle}>
                {archiving ? 'Saving…' : ticket.archived_at ? 'Restore' : 'Archive'}
              </button>
            </>
          )}
        </div>

        {error && <div className="login-error mt-3">{error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>✕</button></div>}
      </div>

      {showTimeline && (
        <div className="card">
          <h3>Timeline</h3>
          {timeline.length === 0 && (
            <div className="empty-state" style={{ padding: 20 }}>
              <p>No history yet.</p>
            </div>
          )}
          {timeline.map((ev) => (
            <div key={ev.id} className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>{ev.event_type}</strong>
                {ev.from_value && ` — ${ev.from_value} → ${ev.to_value}`}
                {' '}
                <span style={{ color: 'var(--text-muted)' }}>({new Date(ev.created_at).toLocaleString()})</span>
                {ev.reason && <span style={{ color: 'var(--text-secondary)' }}> — {ev.reason}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Replies ({ticket.replies.length})</h3>
        {ticket.replies.length === 0 && (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No replies yet. Start the conversation below.</p>
          </div>
        )}
        {ticket.replies.map((r) => (
          <div key={r.id} className={`reply ${r.is_internal ? 'internal' : r.is_customer_reply ? 'customer' : ''}`}>
            <div className="reply-meta">
              {r.is_internal ? '🔒 Internal note' : r.is_customer_reply ? '💬 Customer reply (logged)' : '📧 Agent reply'}
              {' · '}{new Date(r.created_at).toLocaleString()}
            </div>
            <div className="reply-body">{r.body}</div>
          </div>
        ))}

        <form onSubmit={handleReply} style={{ marginTop: 16 }}>
          <textarea
            rows={3}
            placeholder="Write a reply…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            maxLength={5000}
          />
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" checked={replyKind === 'agent'} onChange={() => setReplyKind('agent')} />
              Reply to customer
            </label>
            <label className="radio-label">
              <input type="radio" checked={replyKind === 'internal'} onChange={() => setReplyKind('internal')} />
              Internal note
            </label>
            {isPending && (
              <label className="radio-label">
                <input type="radio" checked={replyKind === 'customer'} onChange={() => setReplyKind('customer')} />
                Log customer reply (resumes SLA)
              </label>
            )}
          </div>
          <button className="btn btn-primary mt-3" type="submit" disabled={replying || !replyBody.trim()}>
            {replying ? 'Sending…' : 'Add Reply'}
          </button>
        </form>
      </div>
    </div>
  );
}
