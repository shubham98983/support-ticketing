# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?

1. Database: Postgres, hosted on Supabase (free tier), accessed via the connection pooler endpoint.
2. Backend: Node.js + Express, plain JavaScript. Talks to Postgres directly via the pg driver's connection pool.



- Where does each piece run?

1. Database: Supabase's managed Postgres, cloud-hosted.


- What is the request path for one representative user action, end to end?


- What did you decide *not* to build, and why?

1. No customer portal or login. Customers continue to communicate by email; agents transcribe correspondence into the system manually. The ten required goals define only agent and supervisor roles, and no customer-facing account or email-ingestion pipeline is required or listed as a stretch idea.

2. No inbound email parsing/ingestion. Considered explicitly and rejected: it's a substantial subsystem on its own that isn't in scope, and it wouldn't fully solve the underlying timestamp-trust problem anyway, since email headers themselves aren't independently verifiable in this system.

3. No collaborator request/approval workflow. Any agent already on a ticket (assignee or collaborator) can directly add another agent as a collaborator; a supervisor can add or remove anyone. A request/accept flow was considered and rejected as scope creep relative to the required goals.

4. No agent-editable "customer replied at" timestamp for SLA purposes. The SLA clock resumes at the system-generated timestamp of when an agent logs a customer's reply, not a backdatable field, because a backdatable field is unverifiable and gameable by the exact person it measures.




