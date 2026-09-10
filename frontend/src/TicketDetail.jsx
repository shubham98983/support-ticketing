import { useEffect, useState } from 'react';
import { api } from './api';

// Mirrors src/domain/lifecycle.js's VALID_TRANSITIONS — kept in sync manually
// since the frontend has no access to the backend's pure function directly.
// The backend is still the source of truth: this only controls which
// buttons are OFFERED, and every click still goes through the real
// transition endpoint, which independently re-validates and can reject it.
const VALID_NEXT_STATUSES = {
  New: ['Open'],
  Open: ['Pending', 'Resolved'],
  Pending: ['Open'],
  Resolved: ['Closed'],
  Closed: ['Open'], // only within the reopen window — backend enforces this
};

export function TicketDetail({ ticketId, user, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [users, setUsers] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [replyKind, setReplyKind] = useState('agent'); // 'agent' | 'internal' | 'customer'
  const [error, setError] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

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
    const events = await api.getTimeline(ticketId);
    setTimeline(events);
    setShowTimeline(true);
  }

  async function handleTransition(targetStatus) {
    setError('');
    try {
      await api.transitionTicket(ticketId, targetStatus);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setError('');
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
    }
  }

  async function handleAddCollaborator() {
    const agentId = prompt('Add which agent as collaborator?\n' + users.map((u) => `${u.id}: ${u.name}`).join('\n'));
    if (!agentId) return;
    try {
      await api.addCollaborator(ticketId, Number(agentId));
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!ticket) return <div className="page">{error ? <p style={{ color: 'red' }}>{error}</p> : 'Loading...'}</div>;

  const nextStatuses = VALID_NEXT_STATUSES[ticket.status] || [];
  const isPending = ticket.status === 'Pending';

  return (
    <div className="page">
      <button className="secondary" onClick={onBack} style={{ marginBottom: 12 }}>&larr; Back to list</button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>#{ticket.id} {ticket.subject}</h2>
          <div>
            <span className={`pill pill-${ticket.status}`}>{ticket.status}</span>{' '}
            <span className={`pill pill-${ticket.priority}`}>{ticket.priority}</span>
          </div>
        </div>
        <p style={{ color: '#4b5563' }}>{ticket.description}</p>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Requester: {ticket.requester_name} ({ticket.requester_email}) &middot; Category: {ticket.category}
        </p>

        <div style={{ marginTop: 12 }}>
          {nextStatuses.map((s) => (
            <button key={s} className="secondary" style={{ marginRight: 8 }} onClick={() => handleTransition(s)}>
              Move to {s}
            </button>
          ))}
          <button className="secondary" onClick={handleAddCollaborator}>+ Add Collaborator</button>{' '}
          <button className="secondary" onClick={loadTimeline}>View Timeline</button>
        </div>
        {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      </div>

      {showTimeline && (
        <div className="card">
          <h3>Timeline</h3>
          {timeline.length === 0 && <p style={{ color: '#6b7280' }}>No history yet.</p>}
          {timeline.map((ev) => (
            <div key={ev.id} className="timeline-item">
              <strong>{ev.event_type}</strong>
              {ev.from_value && ` — ${ev.from_value} → ${ev.to_value}`}
              {' '}({new Date(ev.created_at).toLocaleString()})
              {ev.reason && ` — ${ev.reason}`}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Replies</h3>
        {ticket.replies.length === 0 && <p style={{ color: '#6b7280' }}>No replies yet.</p>}
        {ticket.replies.map((r) => (
          <div key={r.id} className={`reply ${r.is_internal ? 'internal' : r.is_customer_reply ? 'customer' : ''}`}>
            <div className="reply-meta">
              {r.is_internal ? 'Internal note' : r.is_customer_reply ? 'Customer reply (logged)' : 'Agent reply'}
              {' '}&middot; {new Date(r.created_at).toLocaleString()}
            </div>
            {r.body}
          </div>
        ))}

        <form onSubmit={handleReply} style={{ marginTop: 12 }}>
          <textarea
            style={{ width: '100%', padding: 8 }}
            rows={3}
            placeholder="Write a reply..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <div style={{ marginTop: 8 }}>
            <label style={{ marginRight: 12 }}>
              <input type="radio" checked={replyKind === 'agent'} onChange={() => setReplyKind('agent')} /> My reply to customer
            </label>
            <label style={{ marginRight: 12 }}>
              <input type="radio" checked={replyKind === 'internal'} onChange={() => setReplyKind('internal')} /> Internal note
            </label>
            {isPending && (
              <label>
                <input type="radio" checked={replyKind === 'customer'} onChange={() => setReplyKind('customer')} />
                {' '}Log customer's reply (resumes SLA clock)
              </label>
            )}
          </div>
          <button className="primary" type="submit" style={{ marginTop: 8 }}>Add Reply</button>
        </form>
      </div>
    </div>
  );
}
