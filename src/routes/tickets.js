const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { loadTicket, requirePermission } = require('../middleware/authorize');
const authorize = require('../domain/authorize');
const lifecycle = require('../domain/lifecycle');

const router = express.Router();

router.use(requireAuth); // every route below requires a valid token

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// POST /tickets — any authenticated user (agent or supervisor) can create one.
router.post('/', async (req, res) => {
  const { subject, description, requesterName, requesterEmail, priority, category } = req.body;

  if (!subject || !description || !requesterName || !requesterEmail || !priority || !category) {
    return res.status(400).json({
      error: 'subject, description , requesterName, requesterEmail, priority, and category are required.',
    });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const result = await pool.query(
    `INSERT INTO tickets (subject, description, requester_name, requester_email, priority, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [subject, description, requesterName, requesterEmail, priority, category]
  );

  res.status(201).json(result.rows[0]);
});

// GET /tickets — server-side search, filter, sort, and pagination.
// Query params: q, status, priority, category, assigneeId, sort, order, page, pageSize.
// Role scoping (agents see only their own+collaborated tickets) is always applied
// first, then the caller's filters narrow further — never the other way around.
const ALLOWED_SORT_COLUMNS = {
  created_at: 't.created_at',
  updated_at: 't.updated_at',
  // Priority isn't alphabetically ordered by severity, so it needs an explicit
  // CASE mapping rather than sorting the enum's text value directly.
  priority: `CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END`,
};

router.get('/', async (req, res) => {
  const { q, status, priority, category, assigneeId, sort, order, page, pageSize } = req.query;

  const conditions = ['t.archived_at IS NULL'];
  const values = [];
  const addParam = (v) => {
    values.push(v);
    return `$${values.length}`;
  };

  if (req.user.role !== 'supervisor') {
    const p = addParam(req.user.id);
    conditions.push(
      `(t.primary_assignee_id = ${p} OR EXISTS (SELECT 1 FROM ticket_collaborators tc WHERE tc.ticket_id = t.id AND tc.agent_id = ${p}))`
    );
  }

  if (q) {
    const p = addParam(`%${q}%`);
    conditions.push(`(t.subject ILIKE ${p} OR t.description ILIKE ${p})`);
  }
  if (status) conditions.push(`t.status = ${addParam(status)}`);
  if (priority) conditions.push(`t.priority = ${addParam(priority)}`);
  if (category) conditions.push(`t.category = ${addParam(category)}`);
  if (assigneeId) conditions.push(`t.primary_assignee_id = ${addParam(assigneeId)}`);

  const whereClause = conditions.join(' AND ');
  const sortColumn = ALLOWED_SORT_COLUMNS[sort] || ALLOWED_SORT_COLUMNS.created_at;
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const safePageSize = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safePageSize;

  const countResult = await pool.query(`SELECT COUNT(*) FROM tickets t WHERE ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count, 10);

  const limitParam = addParam(safePageSize);
  const offsetParam = addParam(offset);
  const dataResult = await pool.query(
    `SELECT t.* FROM tickets t WHERE ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ${limitParam} OFFSET ${offsetParam}`,
    values
  );

  res.json({ data: dataResult.rows, total, page: safePage, pageSize: safePageSize });
});

// GET /tickets/:id — visibility check via canView.
// loadTicket returns 404 if the ticket doesn't exist at all.
router.get('/:id', loadTicket, requirePermission(authorize.canView), async (req, res) => {
  const repliesResult = await pool.query(
    `SELECT * FROM replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [req.ticket.id]
  );
  res.json({ ...req.ticket, replies: repliesResult.rows });
});

// PATCH /tickets/:id — edit subject/description/priority/category.
router.patch('/:id', loadTicket, requirePermission(authorize.canEdit), async (req, res) => {
  const { subject, description, priority, category } = req.body;

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const result = await pool.query(
    `UPDATE tickets SET
       subject = COALESCE($1, subject),
       description = COALESCE($2, description),
       priority = COALESCE($3, priority),
       category = COALESCE($4, category),
       updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [subject, description, priority, category, req.ticket.id]
  );

  res.json(result.rows[0]);
});

// POST /tickets/:id/transition — the single endpoint for every lifecycle move.
// Authorization (canTransition) and legality (lifecycle.transition) are two
// separate checks, run in that order, and either can reject the request.
router.post(
  '/:id/transition',
  loadTicket,
  requirePermission(authorize.canTransition),
  async (req, res) => {
    const { targetStatus } = req.body;
    if (!targetStatus) {
      return res.status(400).json({ error: 'targetStatus is required.' });
    }

    const result = lifecycle.transition(req.ticket, targetStatus);
    if (!result.ok) {
      return res.status(422).json({ error: result.reason });
    }

    const fields = Object.keys(result.patch);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => result.patch[f]);

    const updateResult = await pool.query(
      `UPDATE tickets SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, req.ticket.id]
    );

    // Record this in the immutable timeline.
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, event_type, from_value, to_value, actor_id)
       VALUES ($1, 'status_change', $2, $3, $4)`,
      [req.ticket.id, req.ticket.status, targetStatus, req.user.id]
    );

    res.json(updateResult.rows[0]);
  }
);

// POST /tickets/:id/replies — adds a reply. If isCustomerReply is true and
// the ticket is currently Pending, this also resumes the SLA clock
// (Pending -> Open) in the same database transaction, so a reply is never
// left orphaned from its status effect if something fails partway through.
router.post('/:id/replies', loadTicket, requirePermission(authorize.canReply), async (req, res) => {
  const { body, isInternal, isCustomerReply } = req.body;
  if (!body) {
    return res.status(400).json({ error: 'body is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const replyResult = await client.query(
      `INSERT INTO replies (ticket_id, author_id, body, is_internal, is_customer_reply)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.ticket.id, req.user.id, body, !!isInternal, !!isCustomerReply]
    );

    let updatedTicket = req.ticket;

    if (isCustomerReply && req.ticket.status === 'Pending') {
      const transitionResult = lifecycle.transition(req.ticket, 'Open');
      if (!transitionResult.ok) {
        // Shouldn't happen in practice (Pending -> Open is always legal
        // unless archived), but if it ever does, don't silently half-apply.
        throw new Error(transitionResult.reason);
      }

      const fields = Object.keys(transitionResult.patch);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = fields.map((f) => transitionResult.patch[f]);

      const updateResult = await client.query(
        `UPDATE tickets SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, req.ticket.id]
      );
      updatedTicket = updateResult.rows[0];

      await client.query(
        `INSERT INTO ticket_events (ticket_id, event_type, from_value, to_value, actor_id, reason)
         VALUES ($1, 'status_change', $2, $3, $4, $5)`,
        [req.ticket.id, req.ticket.status, 'Open', req.user.id, 'Customer reply logged']
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ reply: replyResult.rows[0], ticket: updatedTicket });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to add reply.' });
  } finally {
    client.release();
  }
});

// POST /tickets/:id/collaborators — direct-add, no approval step (see decisions.md #4).
router.post(
  '/:id/collaborators',
  loadTicket,
  requirePermission(authorize.canAddCollaborator),
  async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required.' });
    }

    await pool.query(
      `INSERT INTO ticket_collaborators (ticket_id, agent_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.ticket.id, agentId]
    );
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, event_type, to_value, actor_id)
       VALUES ($1, 'collaborator_added', $2, $3)`,
      [req.ticket.id, String(agentId), req.user.id]
    );

    res.status(201).json({ ok: true });
  }
);

// DELETE /tickets/:id/collaborators/:agentId — supervisor only (see authorize.canRemoveCollaborator).
router.delete(
  '/:id/collaborators/:agentId',
  loadTicket,
  requirePermission(authorize.canRemoveCollaborator),
  async (req, res) => {
    const { agentId } = req.params;

    await pool.query(
      `DELETE FROM ticket_collaborators WHERE ticket_id = $1 AND agent_id = $2`,
      [req.ticket.id, agentId]
    );
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, event_type, from_value, actor_id)
       VALUES ($1, 'collaborator_removed', $2, $3)`,
      [req.ticket.id, agentId, req.user.id]
    );

    res.json({ ok: true });
  }
);

// GET /tickets/:id/timeline — the immutable history feed for goal 9.
router.get('/:id/timeline', loadTicket, requirePermission(authorize.canView), async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM ticket_events WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [req.ticket.id]
  );
  res.json(result.rows);
});

module.exports = router;