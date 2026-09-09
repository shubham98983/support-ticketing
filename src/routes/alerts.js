const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const authorize = require('../domain/authorize');
const sla = require('../domain/sla');

const router = express.Router();
router.use(requireAuth);

// GET /alerts — every non-closed, non-archived ticket the caller can see
// that is currently breaching or at-risk, minus anything already
// acknowledged for its CURRENT epoch (see alert_acknowledgements design —
// a reopened ticket gets a new epoch, so old acknowledgements stop matching
// and the alert can legitimately reappear).
router.get('/', async (req, res) => {
  let query;
  let params;

  if (req.user.role === 'supervisor') {
    query = `SELECT * FROM tickets WHERE archived_at IS NULL AND status IN ('New', 'Open', 'Pending')`;
    params = [];
  } else {
    query = `SELECT t.* FROM tickets t
              WHERE t.archived_at IS NULL AND t.status IN ('New', 'Open', 'Pending')
                AND (t.primary_assignee_id = $1
                     OR EXISTS (SELECT 1 FROM ticket_collaborators tc WHERE tc.ticket_id = t.id AND tc.agent_id = $1))`;
    params = [req.user.id];
  }

  const ticketsResult = await pool.query(query, params);

  const candidates = ticketsResult.rows
    .map((t) => ({ ...t, slaStatus: sla.getSlaStatus(t) }))
    .filter((t) => t.slaStatus === 'breaching' || t.slaStatus === 'at_risk');

  if (candidates.length === 0) {
    return res.json({ data: [], total: 0 });
  }

  const ids = candidates.map((t) => t.id);
  const ackResult = await pool.query(
    `SELECT ticket_id, epoch_started_at FROM alert_acknowledgements WHERE ticket_id = ANY($1)`,
    [ids]
  );
  const acknowledgedKeys = new Set(
    ackResult.rows.map((r) => `${r.ticket_id}:${new Date(r.epoch_started_at).toISOString()}`)
  );

  const active = candidates.filter(
    (t) => !acknowledgedKeys.has(`${t.id}:${new Date(t.epoch_started_at).toISOString()}`)
  );

  res.json({ data: active, total: active.length });
});

// POST /alerts/:ticketId/acknowledge — only the primary assignee (or a
// supervisor) can clear an alert. Recorded against the ticket's CURRENT
// epoch_started_at value, not a fixed reference, so a later reopen
// naturally invalidates this acknowledgement without deleting anything.
router.post('/:ticketId/acknowledge', async (req, res) => {
  const { ticketId } = req.params;

  const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  const ticket = ticketResult.rows[0];
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const authResult = authorize.canAcknowledgeAlert(req.user, ticket);
  if (!authResult.ok) {
    return res.status(403).json({ error: authResult.reason });
  }

  await pool.query(
    `INSERT INTO alert_acknowledgements (ticket_id, epoch_started_at, acknowledged_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (ticket_id, epoch_started_at) DO NOTHING`,
    [ticketId, ticket.epoch_started_at, req.user.id]
  );

  res.json({ ok: true });
});

module.exports = router;