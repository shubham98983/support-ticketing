# Plan

Answer each of these, in your own words.

- How did you break the work into sessions?

Session 1 - planning/analysis before any code.
Session 2 - scaffold + Supabase setup
Session 3 - domain logic (lifecycle + SLA) and tests
Session 4 - History/timeline routes
Session 5 - Search/filter/pagination
Session 6 - Bulk actions + CSV export
Session 7 - Dashboard + alerts
Session 8 - Frontend
Session 9 - Deploy

- What order did you build in, and why that order?

1. I started with Requirements analysis and architecture planning. I am doing this kind of assignment first time. It's actually a real product designing task making internal customer support ticketing platform. Before writing anything, worked through a full requirements matrix, state machine how tickets will move from one state to other , how to design schema , authorization model everything. Reasoning is also graded all moving peices and decision i made so it's best to understand fully.

2. Project scaffold + Supabase connectivity - a minimal Express server hitting a live database, to prove the whole toolchain works before building anything real on top of it.

3. Database schema (migrations 001 + 002) - users/tickets first, then replies/ticket_collaborators/ticket_events/alert_acknowledgements, so every domain decision became a concrete column before any application code depended on it.

4. Domain logic: SLA calculation, then lifecycle state machine — both built and unit tested as pure functions with zero HTTP/database dependencies, before any routes existed. This order was deliberate: these two pieces contain nearly all of the assignment's actual difficulty (the pause/resume clock math, the exact transition rules), so proving them correct in isolation first meant everything built afterward is comparatively low-risk wiring.

5. Backend routes, stage by stage - auth/login, ticket CRUD + the lifecycle transition endpoint, replies/collaborators/timeline, server-side search/filter/sort/pagination, bulk reassign/close + CSV export, dashboard + alerts, and a small /users listing endpoint added when the frontend needed it for reassignment/collaborator dropdowns.

6. Frontend a React (Vite) single-page app built screen by screen: login, then a minimal end-to-end smoke test (login only) to prove the frontend-to-backend connection worked before investing in the rest, then the full ticket list (search/filter/sort/pagination, My Tickets/Collaborating split, bulk actions), ticket detail (replies, valid-only transition buttons, collaborators, timeline), dashboard, and alerts.

7. Deployment: Supabase already live, backend to Render, frontend to Vercel.


- What did you estimate versus what it actually took?


        stage                            Estimated                 Actual

Scaffold +                                1 hour                   1.5 hour 
Supabase connectivity

Lifecycle state machine                   2 hour                   3.5 hour
 + tests
 
SLA calculation +                         2 hour                   3 hour
tests

Auth (login route, roles)                 1 hour                   1 hour

Replies + collaborators routes            1 hour                   1 hour

Search/filter/pagination                  1 hour                   1.5 hour

Bulk actions + CSV export                 1 hour                   1 hour

Dashboard + alerts                        1 hour                   1 hour

Frontend                                  2 hour                   3 hour

Deploy                                    1 hour                   1 hour



- What did you cut when you ran short?

Nothing from the ten required goals was cut. Two explicit, scope exclusion were made like no customer portal/email ingestion, and no self-service account signup (accounts are provisioned via direct SQL insert). Neither is a required goal, and both were scoped out before any code was written for them, not abandoned partway through.
