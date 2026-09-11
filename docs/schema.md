# Schema

Answer each of these, in your own words.

- Table by table: what columns and types does each one have?

users(agent) table
- `id` - SERIAL PK
- `email` - TEXT, UNIQUE, NOT NULL
- `password_hash` - TEXT, NOT NULL
- `name` - TEXT, NOT NULL
- `role` - ENUM('agent', 'supervisor'), NOT NULL
- `created_at` - TIMESTAMPTZ, defaults to now()

tickets table
- `id` - SERIAL PK
- `subject` - TEXT, NOT NULL
- `description` - TEXT
- `requester_name` - TEXT, NOT NULL
- `requester_email` - TEXT, NOT NULL
- `priority` - ENUM('low', 'normal', 'high', 'urgent'), NOT NULL
- `category` - TEXT, NOT NULL
- `status` - ENUM('New', 'Open', 'Pending', 'Resolved', 'Closed'), NOT NULL
- `primary_assignee_id` - INTEGER FK to `users(id)`, nullable
- `created_at`, `updated_at` - TIMESTAMPTZ
- `archived_at` - TIMESTAMPTZ, nullable
- `resolved_at`, `closed_at` - TIMESTAMPTZ, nullable
- `sla_pending_started_at` - TIMESTAMPTZ, nullable
- `sla_paused_seconds` - INTEGER
- `epoch_started_at` - TIMESTAMPTZ, NOT NULL

ticket_collaborators table
- `ticket_id` - INTEGER FK to `tickets(id)`
- `agent_id` - INTEGER FK to `users(id)`
- `added_at` - TIMESTAMPTZ
- Primary key is `(ticket_id, agent_id)`

replies table
- `id` - SERIAL PK
- `ticket_id` - INTEGER FK to `tickets(id)`
- `author_id` - INTEGER FK to `users(id)`
- `body` - TEXT, NOT NULL
- `is_internal` - BOOLEAN
- `is_customer_reply` - BOOLEAN
- `created_at` - TIMESTAMPTZ

ticket_events table
- `id` - SERIAL PK
- `ticket_id` - INTEGER FK to `tickets(id)`
- `event_type` - ENUM
- `from_value`, `to_value` - TEXT, nullable
- `actor_id` - INTEGER FK to `users(id)`
- `reason` - TEXT, nullable
- `created_at` - TIMESTAMPTZ

alert_acknowledgements table
- `id` - SERIAL PK
- `ticket_id` - INTEGER FK to `tickets(id)`
- `epoch_started_at` - TIMESTAMPTZ
- `acknowledged_by` - INTEGER FK to `users(id)`
- `acknowledged_at` - TIMESTAMPTZ
- Unique constraint on `(ticket_id, epoch_started_at)`


- Which relationships are one-to-many, and which are many-to-many?

1. The `users` to `tickets` relationship is one-to-many because one user can be the primary assignee for many tickets.
2. The `users` to `tickets` relationship through `ticket_collaborators` is many-to-many because a ticket can have multiple collaborators and a user can collaborate on multiple tickets.
3. The `tickets` to `replies`, `ticket_events`, and `alert_acknowledgements` relationships are all one-to-many because one ticket can have many replies, events, and acknowledgements.
4. Users also have one-to-many relationships with `replies`, `ticket_events`, and `alert_acknowledgements` because one user can author, perform, or acknowledge many records.


- Which constraints are enforced by the database, and which by application code — and why did you draw the line there?

1. The database enforces foreign keys, unique email addresses, unique alert acknowledgements per breach epoch, the composite primary key on `ticket_collaborators`, enum values, and immutability of `replies` and `ticket_events` through database triggers.
2. Application code handles lifecycle transitions, authorization, SLA calculations, the rule that an agent cannot reassign a ticket away from themselves, and the reopen-window expiry check.
3. The database handles constraints that should always be true regardless of how the database is accessed. Application code handles business rules because those rules may change and are easier to maintain in application logic.


- What did you deliberately denormalise?

1. The main deliberate denormalisation is `ticket_events`. Instead of having separate tables for status history, assignment history, and collaborator history, they are all stored in one `ticket_events` table using `event_type`, `from_value`, and `to_value`. This makes it easier to retrieve one chronological timeline for a ticket, at the cost of some type safety.

2. `alert_acknowledgements.epoch_started_at` is also copied from `tickets` rather than being a foreign key. This means that when a ticket is reopened and its epoch changes, old acknowledgements no longer match the current epoch.


- What would break first if this had 100x the data?

1. The dashboard aggregate queries would probably become the first bottleneck. Queries such as grouping tickets by status or assignee and generating the 8-week resolved-per-week chart currently require full scans.
2. At 100x the data, these could need additional indexes or a periodically refreshed materialized view.
3. Text search on `subject` and `description` would also become slower. A trigram index or PostgreSQL full-text search index would likely be needed if search performance became a problem.