-- Migration 001: users and tickets
-- Run this against your Supabase database first. Replies, collaborators,
-- and history tables come in migration 002 once auth + basic tickets work.

CREATE TYPE user_role AS ENUM ('agent', 'supervisor');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('New', 'Open', 'Pending', 'Resolved', 'Closed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  priority ticket_priority NOT NULL,
  category TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'New',

  primary_assignee_id INTEGER REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- SLA clock fields
  sla_pending_started_at TIMESTAMPTZ,
  sla_paused_seconds INTEGER NOT NULL DEFAULT 0,
  epoch_started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_primary_assignee ON tickets(primary_assignee_id);
CREATE INDEX idx_tickets_archived_at ON tickets(archived_at);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);