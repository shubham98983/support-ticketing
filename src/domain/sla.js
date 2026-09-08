// SLA calculation — pure functions only. No database, no HTTP.
// Takes a plain ticket object (or the relevant fields off one) and a
// reference "now" time, returns elapsed seconds or a status string.
// Keeping this pure makes it directly unit-testable without any mocking.

const PRIORITY_TARGET_SECONDS = {
  urgent: 2 * 3600,
  high: 6 * 3600,
  normal: 12 * 3600,
  low: 24 * 3600,
};

// If a ticket has less than this much time left before breaching, it's "at risk."
const AT_RISK_WINDOW_SECONDS = 1 * 3600;

/**
 * Elapsed SLA time, in seconds, with completed and (if applicable) ongoing
 * Pending time excluded.
 *
 * @param {object} ticket - expects: created_at, status, sla_paused_seconds,
 *   sla_pending_started_at (nullable), resolved_at (nullable), closed_at (nullable)
 * @param {Date} now - reference time; defaults to current time, but pass an
 *   explicit Date in tests so results are deterministic.
 */
function computeElapsedSeconds(ticket, now = new Date()) {
  const created = new Date(ticket.created_at);

  // A closed or resolved ticket's clock is frozen at that moment, not "now."
  const end = ticket.closed_at
    ? new Date(ticket.closed_at)
    : ticket.resolved_at
    ? new Date(ticket.resolved_at)
    : now;

  let pausedSeconds = ticket.sla_paused_seconds || 0;

  // If the ticket is *currently* sitting in Pending, count the ongoing pause
  // too, even though it hasn't been written to sla_paused_seconds yet
  // (that only happens when Pending ends).
  if (ticket.status === 'Pending' && ticket.sla_pending_started_at) {
    const pendingStart = new Date(ticket.sla_pending_started_at);
    pausedSeconds += Math.max(0, (end - pendingStart) / 1000);
  }

  const totalSeconds = (end - created) / 1000;
  return Math.max(0, totalSeconds - pausedSeconds);
}

/**
 * Returns 'ok' | 'at_risk' | 'breaching' for a given ticket at a given time.
 */
function getSlaStatus(ticket, now = new Date()) {
  const target = PRIORITY_TARGET_SECONDS[ticket.priority];
  if (!target) {
    throw new Error(`Unknown priority: ${ticket.priority}`);
  }

  const elapsed = computeElapsedSeconds(ticket, now);
  const remaining = target - elapsed;

  if (remaining <= 0) return 'breaching';
  if (remaining <= AT_RISK_WINDOW_SECONDS) return 'at_risk';
  return 'ok';
}

module.exports = {
  PRIORITY_TARGET_SECONDS,
  AT_RISK_WINDOW_SECONDS,
  computeElapsedSeconds,
  getSlaStatus,
};