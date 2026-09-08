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

  if (!subject || !requesterName || !requesterEmail || !priority || !category) {
    return res.status(400).json({
      error: 'subject, requesterName, requesterEmail, priority, and category are required.',
    });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const result = await pool.query(
    `INSERT INTO tickets (subject, description, requester_name, requester_email, priority, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [subject, description || null, requesterName, requesterEmail, priority, category]
  );

  res.status(201).json(result.rows[0]);
});

// GET /tickets — for now, a simple role-scoped list (full search/filter/pagination is a later stage).
// Agents see only tickets where they are assignee or collaborator; supervisors see everything
// (excluding archived tickets from the default view either way).
router.get('/', async (req, res) => {
  let result;
  if (req.user.role === 'supervisor') {
    result = await pool.query(`SELECT * FROM tickets WHERE archived_at IS NULL ORDER BY created_at DESC`);
  } else {
    result = await pool.query(
      `SELECT DISTINCT t.* FROM tickets t
       LEFT JOIN ticket_collaborators tc ON tc.ticket_id = t.id
       WHERE t.archived_at IS NULL
         AND (t.primary_assignee_id = $1 OR tc.agent_id = $1)
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
  }
  res.json({ data: result.rows, total: result.rows.length });
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

module.exports = router;