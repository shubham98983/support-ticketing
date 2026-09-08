const test = require('node:test');
const assert = require('node:assert/strict');
const { transition } = require('../src/domain/lifecycle');

function baseTicket(overrides = {}) {
  return {
    status: 'New',
    archived_at: null,
    closed_at: null,
    resolved_at: null,
    sla_pending_started_at: null,
    sla_paused_seconds: 0,
    ...overrides,
  };
}

test('New -> Open is valid', () => {
  const result = transition(baseTicket({ status: 'New' }), 'Open');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.status, 'Open');
});

test('New -> Resolved is rejected with a reason', () => {
  const result = transition(baseTicket({ status: 'New' }), 'Resolved');
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /New to Resolved/);
});

test('New -> Closed is rejected', () => {
  const result = transition(baseTicket({ status: 'New' }), 'Closed');
  assert.strictEqual(result.ok, false);
});

test('Open -> Closed is rejected (must pass through Resolved)', () => {
  const result = transition(baseTicket({ status: 'Open' }), 'Closed');
  assert.strictEqual(result.ok, false);
});

test('Open -> Pending records sla_pending_started_at', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const result = transition(baseTicket({ status: 'Open' }), 'Pending', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.sla_pending_started_at, now);
});

test('Pending -> Open folds elapsed pending time into sla_paused_seconds and clears the marker', () => {
  const pendingStart = new Date('2026-01-01T12:00:00Z');
  const now = new Date('2026-01-01T14:00:00Z'); // 2 hours later
  const ticket = baseTicket({
    status: 'Pending',
    sla_pending_started_at: pendingStart,
    sla_paused_seconds: 0,
  });

  const result = transition(ticket, 'Open', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.sla_paused_seconds, 2 * 3600);
  assert.strictEqual(result.patch.sla_pending_started_at, null);
});

test('Pending -> Open accumulates onto existing sla_paused_seconds from an earlier Pending interval', () => {
  const pendingStart = new Date('2026-01-02T09:00:00Z');
  const now = new Date('2026-01-02T10:00:00Z'); // 1 hour later
  const ticket = baseTicket({
    status: 'Pending',
    sla_pending_started_at: pendingStart,
    sla_paused_seconds: 2 * 3600, // 2 hours already paused earlier in the ticket's life
  });

  const result = transition(ticket, 'Open', now);
  assert.strictEqual(result.patch.sla_paused_seconds, 3 * 3600); // 2 + 1
});

test('Open -> Resolved sets resolved_at', () => {
  const now = new Date('2026-01-01T15:00:00Z');
  const result = transition(baseTicket({ status: 'Open' }), 'Resolved', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.resolved_at, now);
});

test('Resolved -> Closed sets closed_at', () => {
  const now = new Date('2026-01-01T16:00:00Z');
  const result = transition(baseTicket({ status: 'Resolved' }), 'Closed', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.closed_at, now);
});

test('Resolved -> Open is rejected (only Closed can reopen, per the spec)', () => {
  const result = transition(baseTicket({ status: 'Resolved', resolved_at: new Date() }), 'Open');
  assert.strictEqual(result.ok, false);
});

test('Pending -> Resolved is rejected (must return to Open first)', () => {
  const result = transition(baseTicket({ status: 'Pending', sla_pending_started_at: new Date() }), 'Resolved');
  assert.strictEqual(result.ok, false);
});

test('Closed -> Open succeeds within the reopen window, starts a new epoch, and clears resolved_at', () => {
  const closedAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-03T00:00:00Z'); // 2 days later, within 7-day window
  const ticket = baseTicket({ status: 'Closed', closed_at: closedAt, resolved_at: new Date('2025-12-31T00:00:00Z') });

  const result = transition(ticket, 'Open', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.epoch_started_at, now);
  assert.strictEqual(result.patch.closed_at, null);
  assert.strictEqual(result.patch.resolved_at, null);
});

test('Closed -> Open is rejected once the reopen window has passed', () => {
  const closedAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-10T00:00:00Z'); // 9 days later, past 7-day window
  const ticket = baseTicket({ status: 'Closed', closed_at: closedAt });

  const result = transition(ticket, 'Open', now);
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /closed more than/);
});

test('a full multi-cycle sequence works and correctly accumulates two separate Pending intervals', () => {
  let ticket = baseTicket({ status: 'New', created_at: new Date('2026-01-01T09:00:00Z') });

  // New -> Open
  let result = transition(ticket, 'Open', new Date('2026-01-01T09:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };

  // Open -> Pending (1st time), for 1 hour
  result = transition(ticket, 'Pending', new Date('2026-01-01T10:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };

  // Pending -> Open (customer replied), 1 hour later
  result = transition(ticket, 'Open', new Date('2026-01-01T11:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };
  assert.strictEqual(ticket.sla_paused_seconds, 1 * 3600);

  // Open -> Pending (2nd time), for 2 hours
  result = transition(ticket, 'Pending', new Date('2026-01-01T12:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };

  // Pending -> Open again, 2 hours later
  result = transition(ticket, 'Open', new Date('2026-01-01T14:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };
  assert.strictEqual(ticket.sla_paused_seconds, 3 * 3600); // 1 hour + 2 hours, accumulated correctly

  // Open -> Resolved
  result = transition(ticket, 'Resolved', new Date('2026-01-01T15:00:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };

  // Resolved -> Closed
  result = transition(ticket, 'Closed', new Date('2026-01-01T15:30:00Z'));
  assert.strictEqual(result.ok, true);
  ticket = { ...ticket, ...result.patch };
  assert.strictEqual(ticket.status, 'Closed');

  // Sanity check with the SLA module: wall clock 9am-3:30pm = 6.5 hours,
  // minus 3 hours paused across the two Pending intervals = 3.5 hours elapsed.
  const { computeElapsedSeconds } = require('../src/domain/sla');
  const elapsedHours = computeElapsedSeconds(ticket) / 3600;
  assert.strictEqual(elapsedHours, 3.5);
});

test('Pending -> Open produces a whole-number sla_paused_seconds even when the interval is not a round number of seconds', () => {
  // Regression test: 55,867ms (55.867s) elapsed in Pending previously
  // produced a fractional value that Postgres rejected as invalid input
  // for its INTEGER column. This must always come out as a whole number.
  const pendingStart = new Date('2026-01-01T12:00:00.000Z');
  const now = new Date('2026-01-01T12:00:55.867Z');
  const ticket = baseTicket({
    status: 'Pending',
    sla_pending_started_at: pendingStart,
    sla_paused_seconds: 0,
  });

  const result = transition(ticket, 'Open', now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(Number.isInteger(result.patch.sla_paused_seconds), true);
  assert.strictEqual(result.patch.sla_paused_seconds, 56); // rounded from 55.867
});

test('An archived ticket rejects any transition', () => {
  const ticket = baseTicket({ status: 'Open', archived_at: new Date() });
  const result = transition(ticket, 'Pending');
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /archived/);
});