const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const sla = require('../domain/sla');

const router = express.Router();
router.use(requireAuth);

function buildScope(req, values) {
  if (req.user.role === 'supervisor') return '';
  values.push(req.user.id);
  const p = `$${values.length}`;
  return ` AND (t.primary_assignee_id = ${p} OR EXISTS (SELECT 1 FROM ticket_collaborators tc WHERE tc.ticket_id = t.id AND tc.agent_id = ${p}))`;
}

router.get('/', async (req, res) => {
  const values = [];
  const scopeClause = buildScope(req, values);
  const baseWhere = `t.archived_at IS NULL${scopeClause}`;

  const [openResult, pendingResult, resolvedThisWeekResult, byStatusResult, byAgentResult, activeTicketsResult, resolvedLast8WeeksResult] =
    await Promise.all([
      pool.query(`SELECT COUNT(*) FROM tickets t WHERE ${baseWhere} AND t.status = 'Open'`, values),
      pool.query(`SELECT COUNT(*) FROM tickets t WHERE ${baseWhere} AND t.status = 'Pending'`, values),
      pool.query(
        `SELECT COUNT(*) FROM tickets t WHERE ${baseWhere} AND t.resolved_at >= date_trunc('week', now())`,
        values
      ),
      pool.query(`SELECT t.status, COUNT(*) FROM tickets t WHERE ${baseWhere} GROUP BY t.status`, values),
      pool.query(
        `SELECT u.name, COUNT(*) FROM tickets t
         JOIN users u ON u.id = t.primary_assignee_id
         WHERE ${baseWhere} GROUP BY u.name`,
        values
      ),
      // Breach/at-risk counting uses the same domain function as /alerts,
      // so the dashboard number and the alerts list can never disagree.
      pool.query(`SELECT * FROM tickets t WHERE ${baseWhere} AND t.status IN ('New', 'Open', 'Pending')`, values),
      pool.query(
        `SELECT date_trunc('week', t.resolved_at) AS week, COUNT(*)
         FROM tickets t WHERE ${baseWhere} AND t.resolved_at >= now() - interval '8 weeks'
         GROUP BY week`,
        values
      ),
    ]);

  const breachingCount = activeTicketsResult.rows.filter((t) => sla.getSlaStatus(t) === 'breaching').length;

  // Zero-fill the last 8 calendar weeks so a week with nothing resolved
  // shows as 0 on the chart, not a missing data point. Postgres's
  // date_trunc('week', ...) uses Monday as the start of the week, so this
  // must match that exactly or the keys silently fail to line up.
  const weekCounts = new Map(
    resolvedLast8WeeksResult.rows.map((r) => [new Date(r.week).toISOString().slice(0, 10), parseInt(r.count, 10)])
  );

  function mondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getUTCDay(); // 0 = Sunday ... 6 = Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diffToMonday);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  const resolvedPerWeek = [];
  const thisMonday = mondayOfWeek(new Date());
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
    const key = weekStart.toISOString().slice(0, 10);
    resolvedPerWeek.push({ weekStart: key, count: weekCounts.get(key) || 0 });
  }

  res.json({
    openCount: parseInt(openResult.rows[0].count, 10),
    pendingCount: parseInt(pendingResult.rows[0].count, 10),
    resolvedThisWeek: parseInt(resolvedThisWeekResult.rows[0].count, 10),
    breachingCount,
    byStatus: Object.fromEntries(byStatusResult.rows.map((r) => [r.status, parseInt(r.count, 10)])),
    byAgent: Object.fromEntries(byAgentResult.rows.map((r) => [r.name, parseInt(r.count, 10)])),
    resolvedPerWeek,
  });
});

module.exports = router;