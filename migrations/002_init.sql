-- Migration 002: replies, collaborators, history, and alert acknowledgements
-- Run this in Supabase's SQL Editor after 001_init.sql has already succeeded.

-- Replies: every reply belongs to one ticket and one author.
-- is_internal = agent-only note. is_internal = false + is_customer_reply = true
-- is the distinct "log customer reply" action that resumes the SLA clock.
CREATE TABLE replies (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_customer_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_replies_ticket_id ON replies(ticket_id);

-- Collaborators: many-to-many between tickets and users.
-- Composite primary key doubles as a duplicate-prevention constraint.
CREATE TABLE ticket_collaborators (
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  agent_id INTEGER NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, agent_id)
);

CREATE INDEX idx_collaborators_agent_id ON ticket_collaborators(agent_id);

-- Unified append-only timeline: status changes, reassignments, collaborator adds/removes.
-- One table, one ordered query for "show me this ticket's history."
CREATE TYPE ticket_event_type AS ENUM (
  'status_change',
  'reassignment',
  'collaborator_added',
  'collaborator_removed'
);

CREATE TABLE ticket_events (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  event_type ticket_event_type NOT NULL,
  from_value TEXT,
  to_value TEXT,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_ticket_id ON ticket_events(ticket_id);

-- Alert acknowledgements: scoped to a breach "epoch" so a reopened-and-rebreached
-- ticket's alert can reappear even though a prior acknowledgement row still exists.
CREATE TABLE alert_acknowledgements (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  epoch_started_at TIMESTAMPTZ NOT NULL,
  acknowledged_by INTEGER NOT NULL REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, epoch_started_at)
);

-- Defense-in-depth: make replies and ticket_events truly immutable at the DB
-- level, not just "no route exists for it." Even a supervisor with direct
-- database access cannot rewrite history.
CREATE OR REPLACE FUNCTION reject_update_or_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'This table is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER replies_no_update
  BEFORE UPDATE OR DELETE ON replies
  FOR EACH ROW EXECUTE FUNCTION reject_update_or_delete();

CREATE TRIGGER ticket_events_no_update
  BEFORE UPDATE OR DELETE ON ticket_events
  FOR EACH ROW EXECUTE FUNCTION reject_update_or_delete();