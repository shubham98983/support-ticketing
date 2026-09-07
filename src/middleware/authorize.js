// Express middleware wrapper around src/domain/authorize.js.
// This file's only job is fetching data (the ticket, its collaborator ids)
// and handing plain objects to the pure authorization functions — it never
// contains permission logic itself. Keeping the split this way means the
// actual rules are unit-tested with zero database/HTTP setup.

const pool = require('../db');

/**
 * Fetches a ticket and its collaborator ids, attaches them to req, and
 * calls next(). Returns 404 (not 403) if the ticket doesn't exist, so we
 * never leak whether a ticket exists to someone not authorized to see it.
 */

async function loadTicket(req, res, next) {
  const ticketId = req.params.id;
  const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  const ticket = result.rows[0];

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const collabResult = await pool.query(
    'SELECT agent_id FROM ticket_collaborators WHERE ticket_id = $1',
    [ticketId]
  );

  req.ticket = ticket;
  req.collaboratorIds = collabResult.rows.map((r) => r.agent_id);
  next();
}

/**
 * Middleware factory. Usage:
 *   router.patch('/tickets/:id', loadTicket, requirePermission(authorize.canEdit), handler)
 *
 * Must run AFTER loadTicket (needs req.ticket / req.collaboratorIds) and
 * AFTER whatever sets req.user (the auth middleware, not yet built).
 *
 * `checkFn` is one of the pure functions from src/domain/authorize.js.
 * Anything beyond (user, ticket, collaboratorIds) — e.g. canReassign's
 * targetAgentId — should be checked separately in the route handler itself,
 * since only the handler knows the request body's shape.
 */
function requirePermission(checkFn) {
  return (req, res, next) => {
    const result = checkFn(req.user, req.ticket, req.collaboratorIds);
    if (!result.ok) {
      return res.status(403).json({ error: result.reason });
    }
    next();
  };
}

module.exports = { loadTicket, requirePermission };