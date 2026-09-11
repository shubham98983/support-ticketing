# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?

1. Database: Postgres, hosted on Supabase (free tier), accessed via the connection pooler endpoint.
2. Backend: Node.js + Express, plain JavaScript. Talks to Postgres directly via the pg driver's connection pool.
3. Domain layer: business logic lives in pure, dependency-free functions under src/domain/ — lifecycle.js(state machine), sla.js (response-clock calculation), and authorize.js (permission rules).
4. Routes: POST /auth/login; GET/POST /tickets, GET/PATCH /tickets/:id, POST /tickets/:id/transition, POST /tickets/:id/replies, POST/DELETE /tickets/:id/collaborators, GET /tickets/:id/timeline, GET /tickets/export.csv, POST /tickets/bulk/reassign, POST /tickets/bulk/close; GET /alerts, POST /alerts/:id/acknowledge; GET /dashboard; GET /users.
5. Frontend: Frontend: React with Vite, written in plain JavaScript/JSX. It is a single-page application that uses react-router-dom and BrowserRouter for client-side routing. The main authenticated views are Dashboard, Tickets, Ticket Detail, and Alerts, with routes such as /dashboard, /tickets, /tickets/:id, and /alerts; it also includes a Login view.
6. Hosting: Supabase (DB, live) , Render (backend) , Vercel (frontend).


- Where does each piece run?

1. Database: Supabase's managed Postgres, cloud-hosted.
2. Backend: https://support-ticketing-wya1.onrender.com
3. Frontend: https://support-ticketing-six.vercel.app


- What is the request path for one representative user action, end to end?

Action: An agent logs a customer's reply while the ticket is in Pending, which must both record the reply and resume the SLA clock atomically.

POST /tickets/1/replies with { body, isCustomerReply: true } and an Authorization: Bearer <token> header.

1. requireAuth (src/middleware/requireAuth.js) verifies the JWT, sets req.user = { id, email, role, name }. Rejects with 401 if the token is missing/invalid before anything else runs.

2. loadTicket (src/middleware/authorize.js) fetches the ticket row and its collaborator id list from Postgres. Returns 404 immediately if the ticket doesn't exist the route handler below never runs for a nonexistent ticket, and we don't distinguish "doesn't exist" from "not authorized to see it," to avoid leaking ticket existence to someone unauthorized.

3. requirePermission(authorize.canReply) calls the pure function from src/domain/authorize.js with (req.user, req.ticket, req.collaboratorIds). Returns 403 with a reason if the caller is neither the assignee, a collaborator, nor a supervisor.

4. Route handler (src/routes/tickets.js) opens a database transaction (BEGIN):
    (i). Inserts the new row into replies (is_customer_reply = true).
   (ii). Since the ticket's current status is Pending, calls lifecycle.transition(ticket, 'Open') a pure    function from src/domain/lifecycle.js with no database access which returns a patch object: the new status, sla_pending_started_at cleared, and sla_paused_seconds incremented by however long the ticket sat in Pending.
   (iii). Applies that patch with an UPDATE tickets ... RETURNING *.
   (iv).  Inserts a row into ticket_events (event_type = 'status_change') recording the old status, new status, and actor.
   (v). COMMITs all three writes together. If anything in this block throws, the whole transaction rolls back.

5. Responds with { reply, ticket } both the new reply row and the fully updated ticket, so the frontend never needs a second round-trip to see the new status.

6. On the frontend: TicketDetail.jsx re-fetches the ticket after the reply succeeds re-rendering the status pill and the transition button set.

The key architectural point this path demonstrates: authorization (step 3) and business-rule legality (step 4's call into lifecycle.js) are two separate independently-testable checks run in that order and neither one knows about the other.


- What did you decide *not* to build, and why?

1. No customer portal or login. Customers continue to communicate by email; agents transcribe correspondence into the system manually. The ten required goals define only agent and supervisor roles, and no customer-facing account or email-ingestion pipeline is required or listed as a stretch idea.

2. No inbound email parsing/ingestion. Considered explicitly and rejected: it's a substantial subsystem on its own that isn't in scope, and it wouldn't fully solve the underlying timestamp-trust problem anyway, since email headers themselves aren't independently verifiable in this system.

3. No collaborator request/approval workflow. Any agent already on a ticket (assignee or collaborator) can directly add another agent as a collaborator; a supervisor can add or remove anyone. A request/accept flow was considered and rejected as scope creep relative to the required goals.

4. No agent-editable "customer replied at" timestamp for SLA purposes. The SLA clock resumes at the system-generated timestamp of when an agent logs a customer's reply, not a backdatable field, because a backdatable field is unverifiable and gameable by the exact person it measures.

5. No self-service account signup.Accounts (both agent and supervisor) are provisioned directly via SQL insert against the seeded/demo database there is no POST /auth/signup or admin-facing "create user" screen.Goal 1 only requires that people "sign in with an email and password" it doesn't require self-registration.


