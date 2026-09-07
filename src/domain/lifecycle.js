// Ticket lifecycle state machine — pure function only. No database, no HTTP.
// Every valid transition is listed explicitly; anything not listed is invalid.
// Authorization (who is allowed to act on THIS ticket) is a separate concern,
// handled elsewhere (src/middleware/authorize.js) — this function only knows
// about state, not about who's asking.

const REOPEN_WINDOW_SECONDS = 7 * 24 * 3600; // 7 days, arbitrary — see docs/decisions.md

// Map of currentStatus -> Set of statuses it can legally move to.
const VALID_TRANSITIONS = {
  New: new Set(['Open']),
  Open: new Set(['Pending', 'Resolved']),
  Pending: new Set(['Open']), // Pending only ever returns to Open (customer replied) — never straight to Resolved
  Resolved: new Set(['Closed']), // reopening a Resolved ticket isn't in the spec — only Closed can reopen, and only within the window
  Closed: new Set(['Open']), // only within the reopen window — checked separately below
};

/**
 * Attempts a status transition.
 *
 * @param {object} ticket - expects: status, archived_at (nullable), closed_at (nullable)
 * @param {string} targetStatus - one of New/Open/Pending/Resolved/Closed
 * @param {Date} now - reference time, defaults to current time
 * @returns {{ok: true, patch: object} | {ok: false, reason: string}}
 *   `patch` is the set of fields the caller should apply to the ticket row
 *   (e.g. { status: 'Closed', closed_at: now }) — this function does not
 *   touch the database itself.
 */
function transition(ticket, targetStatus, now = new Date()) {
  if (ticket.archived_at) {
    return { ok: false, reason: 'Cannot change the status of an archived ticket. Restore it first.' };
  }

  const currentStatus = ticket.status;
  const allowedTargets = VALID_TRANSITIONS[currentStatus];

  if (!allowedTargets || !allowedTargets.has(targetStatus)) {
    return {
      ok: false,
      reason: `Cannot move a ticket from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // Special case: Closed -> Open is only valid within the reopen window.
  if (currentStatus === 'Closed' && targetStatus === 'Open') {
    const closedAt = new Date(ticket.closed_at);
    const secondsSinceClosed = (now - closedAt) / 1000;
    if (secondsSinceClosed > REOPEN_WINDOW_SECONDS) {
      return {
        ok: false,
        reason: `This ticket was closed more than ${REOPEN_WINDOW_SECONDS / 86400} days ago and can no longer be reopened.`,
      };
    }
  }

  return { ok: true, patch: buildPatch(ticket, targetStatus, now) };
}

/**
 * Builds the field updates that go along with a given transition —
 * separated out so the transition rules above stay easy to read.
 */
function buildPatch(ticket, targetStatus, now) {
  const currentStatus = ticket.status;
  const patch = { status: targetStatus, updated_at: now };

  if (targetStatus === 'Pending') {
    patch.sla_pending_started_at = now;
  }

  if (currentStatus === 'Pending' && targetStatus === 'Open') {
    // Pending is ending now: fold the time just spent paused into the
    // running total, then clear the "currently pending since" marker.
    const pendingStart = new Date(ticket.sla_pending_started_at);
    const justPausedSeconds = Math.max(0, (now - pendingStart) / 1000);
    patch.sla_paused_seconds = (ticket.sla_paused_seconds || 0) + justPausedSeconds;
    patch.sla_pending_started_at = null;
  }

  if (targetStatus === 'Resolved') {
    patch.resolved_at = now;
  }

  if (targetStatus === 'Closed') {
    patch.closed_at = now;
  }

  if (currentStatus === 'Closed' && targetStatus === 'Open') {
    // Reopening starts a new "epoch" so a prior alert acknowledgement no
    // longer applies — see docs/decisions.md and alert_acknowledgements design.
    patch.epoch_started_at = now;
    patch.closed_at = null;
    // A ticket can only reach Closed via Resolved, so reopening it also
    // needs to clear resolved_at — otherwise it would look "resolved" again
    // the instant it reopens, before anyone has done anything.
    patch.resolved_at = null;
  }

  return patch;
}

module.exports = { transition, VALID_TRANSITIONS, REOPEN_WINDOW_SECONDS };