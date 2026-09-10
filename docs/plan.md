# Plan

Answer each of these, in your own words.

- How did you break the work into sessions?

Session 1 — planning/analysis before any code.
Session 2 — scaffold + Supabase setup
Session 3 — domain logic (lifecycle + SLA) and tests


- What order did you build in, and why that order?

1. I started with Requirements analysis and architecture planning. I am doing this kind of assignment first time. It's actually a real product designing task making internal customer support ticketing platform. Before writing anything, worked through a full requirements matrix, state machine how tickets will move from one state to other , how to design schema , authorization model everything. Reasoning is also graded all moving peices and decision i made so it's best to understand fully.

2. Project scaffold + Supabase connectivity — a minimal Express server hitting a live database, to prove the whole toolchain works before building anything real on top of it.

3. Database schema (migrations 001 + 002) — users/tickets first, then replies/ticket_collaborators/ticket_events/alert_acknowledgements, so every domain decision became a concrete column before any application code depended on it.

4. Domain logic: SLA calculation, then lifecycle state machine — both built and unit tested as pure functions with zero HTTP/database dependencies, before any routes existed. This order was deliberate: these two pieces contain nearly all of the assignment's actual difficulty (the pause/resume clock math, the exact transition rules), so proving them correct in isolation first meant everything built afterward is comparatively low-risk wiring.




- What did you estimate versus what it actually took?


        stage                            Estimated                 Actual
Scaffold +                                1 hour                   1.5 hour 
Supabase connectivity

Lifecycle state machine                   2 hour                   3.5 hour
 + tests
 
SLA calculation +                         2 hour                   3 hour
tests





- What did you cut when you ran short?

