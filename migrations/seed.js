// Seeds two demo users (one agent, one supervisor) and one demo ticket.
// Run with: node migrations/seed.js
// Requires bcrypt: npm install bcrypt

const bcrypt = require('bcrypt');
const pool = require('../src/db');

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const agent = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['agent@demo.com', passwordHash, 'Alex Agent', 'agent']
  );

  const supervisor = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['supervisor@demo.com', passwordHash, 'Sam Supervisor', 'supervisor']
  );

  console.log('Seeded users:', { agent: agent.rows[0], supervisor: supervisor.rows[0] });

  // Fetch agent id (in case ON CONFLICT skipped the insert on a re-run)
  const agentRow = await pool.query(`SELECT id FROM users WHERE email = 'agent@demo.com'`);
  const agentId = agentRow.rows[0].id;

  const ticket = await pool.query(
    `INSERT INTO tickets (subject, description, requester_name, requester_email, priority, category, status, primary_assignee_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    ['Cannot access invoice history', 'Customer reports 404 on invoice page.', 'Jamie Customer', 'jamie@example.com', 'high', 'billing', 'New', agentId]
  );

  console.log('Seeded ticket:', ticket.rows[0]);

  const ticketId = ticket.rows[0].id;
  const supervisorRow = await pool.query(`SELECT id FROM users WHERE email = 'supervisor@demo.com'`);
  const supervisorId = supervisorRow.rows[0].id;

  // Add the supervisor as a collaborator on the demo ticket
  await pool.query(
    `INSERT INTO ticket_collaborators (ticket_id, agent_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [ticketId, supervisorId]
  );
  console.log('Seeded collaborator:', { ticketId, supervisorId });

  // Add one internal note from the primary assignee
  const reply = await pool.query(
    `INSERT INTO replies (ticket_id, author_id, body, is_internal, is_customer_reply)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [ticketId, agentId, 'Checked billing system, this looks like a caching issue on the invoice page — investigating.', true, false]
  );
  console.log('Seeded reply:', reply.rows[0]);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});