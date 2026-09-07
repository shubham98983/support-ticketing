const test = require('node:test');
const assert = require('node:assert/strict');
const { computeElapsedSeconds, getSlaStatus } = require('../src/domain/sla');

test('excludes a completed Pending interval from elapsed time', () => {
  const ticket = {
    created_at: '2026-01-01T10:00:00Z',
    status: 'Closed',
    closed_at: '2026-01-01T17:00:00Z',
    sla_paused_seconds: 2 * 3600, // written when Pending ended at 4pm
    sla_pending_started_at: null,
  };

  const elapsedHours = computeElapsedSeconds(ticket) / 3600;
  assert.strictEqual(elapsedHours, 5);
});

test('counts ongoing Pending time even though it has not been written to sla_paused_seconds yet', () => {
  const now = new Date('2026-01-01T14:00:00Z');
  const ticket = {
    created_at: '2026-01-01T10:00:00Z',
    status: 'Pending',
    sla_paused_seconds: 0,
    sla_pending_started_at: '2026-01-01T12:00:00Z',
  };

  // 4 hours since creation, minus 2 hours of ongoing pause = 2 hours elapsed.
  const elapsedHours = computeElapsedSeconds(ticket, now) / 3600;
  assert.strictEqual(elapsedHours, 2);
});

test('reports breaching once elapsed time exceeds the priority target', () => {
  const now = new Date('2026-01-01T13:00:00Z');
  const ticket = {
    created_at: '2026-01-01T10:00:00Z', // 3 hours ago
    status: 'Open',
    priority: 'urgent', // target is 2 hours
    sla_paused_seconds: 0,
    sla_pending_started_at: null,
  };

  assert.strictEqual(getSlaStatus(ticket, now), 'breaching');
});

test('reports at_risk when close to the target but not past it', () => {
  const now = new Date('2026-01-01T15:30:00Z');
  const ticket = {
    created_at: '2026-01-01T10:00:00Z', // 5.5 hours ago
    status: 'Open',
    priority: 'high', // target is 6 hours, at-risk window is 1 hour
    sla_paused_seconds: 0,
    sla_pending_started_at: null,
  };

  assert.strictEqual(getSlaStatus(ticket, now), 'at_risk');
});

test('reports ok when comfortably within the target', () => {
  const now = new Date('2026-01-01T11:00:00Z');
  const ticket = {
    created_at: '2026-01-01T10:00:00Z', // 1 hour ago
    status: 'Open',
    priority: 'high', // target is 6 hours
    sla_paused_seconds: 0,
    sla_pending_started_at: null,
  };

  assert.strictEqual(getSlaStatus(ticket, now), 'ok');
});

test('a resolved ticket freezes the clock at resolved_at, not at "now"', () => {
  const now = new Date('2026-01-05T10:00:00Z'); // days later
  const ticket = {
    created_at: '2026-01-01T10:00:00Z',
    status: 'Resolved',
    resolved_at: '2026-01-01T12:00:00Z', // resolved 2 hours after creation
    sla_paused_seconds: 0,
    sla_pending_started_at: null,
  };

  const elapsedHours = computeElapsedSeconds(ticket, now) / 3600;
  assert.strictEqual(elapsedHours, 2); // not days
});