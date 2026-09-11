# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** <https://github.com/shubham98983/support-ticketing>
- **Live application:** <https://support-ticketing-six.vercel.app/login>

## Notes for the reviewer

The first sign-in and dashboard load may take a little time. Please allow a few seconds for the application to load.

## Demo credentials

| Role      | Email          | Password   |
|-----------|----------------|------------|
|agent      |agent1@demo.com | password123|
|agent      |agent2@demo.com | password123|
|agent      |agent3@demo.com | password123|
|agent      |agent4@demo.com | password123|
|supervisor |agent4@demo.com | password123|


## Stack

## Technology Stack

| Layer | What You Used | Why |
|---|---|---|
| Frontend | React 19, Vite, JavaScript/JSX | Fast single-page interface with client-side routing. |
| Backend | Node.js, Express 5, JWT, bcrypt | REST API with authentication, role-based authorization, ticket lifecycle, and SLA logic. |
| Database | PostgreSQL on Supabase | Relational model for tickets, replies, collaborators, events, and users. |
| Hosting | Vercel, Render, Supabase | Free-tier hosting for frontend, backend, and database. |


## Goal checklist

| # | Goal | Status | Notes |
| -- | ---- | ------------------------- | -------------------- |
| 1 | Accounts and roles | Done | Implemented signin with email and password. Role based access for tickets.|
| 2 | Tickets | Done | Tickets can be created and edited, then archived or restored|
| 3 | Replies inside tickets | Done | Replies have a ticket, author, body, timestamp, internal/customer flags, and appear in chronological order in ticket detail. |
| 4 | Ticket lifecycle | Done | The lifecycle rules, reopen window, SLA pause calculation, and server-side rejection messages are implemented.|
| 5 | Collaborators | Done | Tickets support one primary assignee and many collaborators; collaborators can act on tickets and agents see assigned plus collaborated tickets.|
| 6 | Finding tickets | Done | Search, server-side filtering, sorting, pagination, totals, and CSV export are implemented on the backend. The UI exposes search, status, priority, and sorting|
| 7 | Bulk actions and CSV | Done | Supervisors can bulk reassign or close tickets, receive per-ticket success/failure results, and export the current filtered queue as CSV. |
| 8 | Dashboard | Done | Includes open, pending, resolved-this-week, and breaching counts, status and agent breakdowns, plus an eight-week resolved chart|
| 9 | Immutable history | Done | Status changes and reassignments are recorded in an append-only timeline protected by database triggers. Replies are displayed separately and are immutable|
| 10 | SLA alerts | Done | At-risk and breached tickets appear in alerts, the navigation shows a count badge, assignees can acknowledge alerts, and acknowledgement is reset for a reopened ticket’s new SLA epoch. |

## How much time did you actually spend?
I spent around 17.5 hours in total. It took longer than I initially estimated because the lifecycle state machine, SLA logic, and frontend needed more testing and debugging than expected.

## What would you do next, with another 12 hours?
With another 12 hours, I would focus on improving the UI, adding more test cases and may work on any stretched idea.

## What are you least happy with in this codebase, and why?
I am least happy with the frontend because some parts are still basic and can be improved for a better user experience.