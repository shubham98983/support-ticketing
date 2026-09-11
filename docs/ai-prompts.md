# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

1.
## <What you were trying to achieve>
Requirements analysis and architecture planning.

### Prompt

# Senior Software Engineer — Assignment 04

Act as a principal/senior software engineer with 20+ years of experience designing and shipping production web applications.

I am completing a software engineering take-home assignment called **Assignment 04 - Support Ticketing**.

I will provide the complete assignment specification below. Treat the specification as the source of truth. Do not silently add requirements or remove requirements.

## Your role

Approach this as an experienced engineer reviewing a candidate's implementation for:

* correctness
* architecture
* security
* data modeling
* API design
* authorization
* state-machine design
* concurrency and consistency
* testability
* maintainability
* deployment
* engineering judgment
* documentation
* scope management

The application itself is important, but the assignment explicitly evaluates the **thinking behind the application**: decisions, trade-offs, implementation order, things deliberately excluded, and whether the candidate can explain the system.

Therefore, optimize for a solution that is:

1. Correct
2. Simple enough to build within approximately 12 hours
3. Easy to explain in an interview
4. Secure on the server
5. Well tested around business rules
6. Demonstrates deliberate engineering decisions
7. Properly documented
8. Deployable using free-tier infrastructure

## First: analyze before coding

Before proposing implementation, perform a requirements analysis.

Create:

### 1. Requirements matrix

For every one of the 10 required goals, identify:

* requirement
* business rule
* affected entities
* API/backend implications
* frontend implications
* authorization implications
* important edge cases
* tests required
* acceptance criteria

Pay particular attention to requirements where the specification gives an exact behavioral rule.

### 2. Domain model

Identify the core entities and relationships.

Consider at minimum:

* User
* Role
* Ticket
* Reply
* Collaborator
* Assignment
* Status history
* Alert / alert acknowledgement

Do not automatically create a table for every noun. Explain which concepts deserve persistence and which can be represented differently.

### 3. State machine

Model the ticket lifecycle explicitly:

New → Open → Pending → Resolved → Closed

Identify:

* valid transitions
* invalid transitions
* who can perform each transition
* what happens to the SLA clock
* what happens when a customer reply arrives
* the closed-ticket reopening rule
* what the server must reject

Recommend implementing lifecycle transitions as explicit domain/business logic rather than scattered conditionals.

### 4. Authorization model

Define server-side permissions for:

* agent
* supervisor

Explicitly address:

* viewing tickets
* editing tickets
* replying
* adding collaborators
* reassigning
* closing
* reopening
* bulk actions
* dashboard data
* alerts

Never rely on frontend hiding for authorization.

### 5. SLA design

Design the response-clock calculation carefully.

Explain:

* where the target response time comes from
* how elapsed time is calculated
* how Pending pauses the clock
* how customer replies resume it
* how breach status is determined
* how “at risk” is determined
* how alerts reappear after a reopened/rebreached ticket
* whether SLA state should be calculated dynamically or persisted

Prefer the simplest robust design appropriate for a 12-hour assignment.

### 6. API design

Propose the API endpoints before implementation.

For each endpoint provide:

* HTTP method
* path
* authorization
* request shape
* response shape
* important validation
* error behavior

Include:

* authentication
* tickets
* replies
* collaborators
* lifecycle transitions
* assignment
* bulk actions
* search/filter/pagination
* CSV export
* dashboard
* SLA alerts

### 7. Database design

Propose the schema and explain:

* primary keys
* foreign keys
* indexes
* unique constraints
* enum/status representation
* many-to-many relationships
* immutable history
* timestamps
* soft archive behavior

Explicitly identify which constraints belong in the database and which belong in application/domain logic.

### 8. Architecture options

Propose 2–3 realistic architectures that can be completed in approximately 12 hours.

For each architecture evaluate:

* implementation speed
* complexity
* maintainability
* deployment difficulty
* testability
* interview explainability
* risk

Then recommend ONE.

Do not recommend technologies simply because they are fashionable.

### 9. Testing strategy

Define the minimum high-value test suite.

Prioritize business-critical behavior over superficial UI tests.

Include tests for:

* authorization
* lifecycle transitions
* invalid transitions
* closed-ticket reopening window
* SLA pause/resume
* SLA breach
* collaborators
* bulk operation partial success
* immutable history
* server-side filtering/pagination
* alert acknowledgement/reappearance

### 10. Delivery plan

Create a realistic 12-hour implementation plan.

Prioritize the ten mandatory requirements.

For each stage specify:

* goal
* estimated time
* files/components likely to change
* tests to write
* Git commit point
* documentation to update

Do NOT recommend stretch features until all ten required goals are complete.

## Engineering principles

Follow these principles throughout:

* Prefer boring, well-understood technology.
* Minimize unnecessary dependencies.
* Avoid premature abstraction.
* Keep business rules in the backend/domain layer.
* Treat authorization as a backend concern.
* Prefer explicit code over clever code.
* Design for correctness before optimization.
* Use transactions where atomicity matters.
* Consider concurrent updates and stale data where relevant.
* Keep immutable audit/history records truly immutable.
* Avoid loading the entire ticket dataset into the browser.
* Use server-side filtering, sorting, pagination and counts.
* Make bulk operations partially successful rather than all-or-nothing when required.
* Do not build optional features at the expense of mandatory requirements.

## Important assignment constraint

The assignment explicitly requires documentation of:

* architecture
* schema
* implementation plan
* engineering decisions
* actual AI prompts used

It also requires meaningful incremental Git commits.

Therefore, recommend a workflow where the AI assists me but does not replace my engineering judgment.

## How I want you to respond

Do NOT immediately generate the entire application.

First give me:

1. Executive assessment of the assignment
2. Hidden/high-risk requirements
3. Recommended architecture
4. Alternative architectures and trade-offs
5. Domain model
6. State-machine design
7. Authorization model
8. SLA approach
9. API design
10. Database schema
11. Testing strategy
12. 12-hour implementation plan
13. Git commit strategy
14. Documentation strategy
15. Biggest ways a candidate could lose points
16. Questions I should be able to answer in an interview

After that, wait for me to choose the stack and implementation approach before generating code.

Throughout the project, challenge my decisions when you believe there is a simpler or more robust alternative.

Do not blindly agree with me.

When generating code later:

* explain the architectural reason briefly
* identify important edge cases
* include tests for business-critical behavior
* keep the implementation appropriate for the assignment's time budget
* do not generate unnecessary boilerplate
* make assumptions explicit

When reviewing my implementation, act as a skeptical senior engineer conducting a code review rather than as a friendly assistant.

Here is the assignment specification: pasted assignment specifications.

### What you got
A full written analysis covering all of the above, recommending Node/Express/Postgres/React, with an explicit alternative-architectures comparison (including a Firebase/Supabase-as-backend option).

### What you corrected
Nothing needed correcting at this stage used as the baseline plan, but several individual decisions inside it were revisited once I thought about them more concretely.


2.
## <What you were trying to achieve>
How to handle customer reply and how sla clock will be resumed from pending state.

### Prompt
 Customer is still using email to communicate with us and he has no access to our internal support ticketing then how his reply his added to ticket , when we are waiting for his reply in pending state (like share your invoice number) he replied but our agent not opened his email for 2-3 hours then how will clock again resume.

### What you got
I got suggestion to add an agent editable customer_replied_at field the agent could backdate to the real email time framed as more accurate for the SLA calculation.

### What you corrected
This will allow the agent control the measurement, with no way to verify. He can fill the customer replied late and his response is on time. So I keek the SLA clock will resumes at the system-generated timestamp of when the agent logs the reply, no backdating field at all.

3. 
## <What you were trying to achieve>
How to model the perfect lifecycle transition according to given in assignment as Ticket lifecycle.

### Prompt
Based on the given assignment generate the lifecycle.js file and model the ticket lifecycle exactly as defined in the assignment. Transition must follow the lifecycle flow given in the assignment.

### What you got
I got full ticket lifecycle transitions but few extra transitions which are not necessary or invalid. Like It allowed both states open and directly resolved from pending. And it also allowed a resolved to ticket to open which is not required.

### What you corrected
I made two changes to the lifecycle transitions. The Resolved → Open transition is not explicitly permitted by the assignment so it has been removed. For Closed ticket can only be reopened within the fixed time window specified by the assignment. For Pending ticket cannot transition directly to Resolved instead we will wait for the customer to reply during which time the clock remains paused. Once the customer responds ticket can transition only to Open.

4. 
## <What you were trying to achieve>
Wiring auth, ticket CRUD, and lifecycle routes.

### Prompt
Build the real Express routes on our tested domain modules: login, ticket and the lifecycle transition.

### What you got
src/routes/auth.js, src/middleware/requireAuth.js, and src/routes/tickets.js, all wired into server.js.

### What you corrected
Nothing much corrected this time. All the requirements of ticket creation are already stated and clear. It allowed the description to be NULL which i changed to NON-NULLABLE.

5. 
## <What you were trying to achieve>
Building replies, collaborators, and the timeline endpoint.

### Prompt
Everything working accordingly now build the reply-adding route including the specific rule that logging a customer reply while Pending should also resume the SLA clock, collaborator add/remove, and the ticket history/timeline endpoint.

### What you got
Got the reply-adding route, collaborator add/remove functionality, and ticket history/timeline endpoint implemented. The customer reply flow also correctly resumes the SLA clock when a ticket is in Pending status.

### What you corrected
Here also requirements are clear so not much correction are needed. just reviewed the code and tested the end point and by logging customer reply the ticket should move from pending->open.

6. 
## <What you were trying to achieve>
Building dashboard and alert system for out ticket supporting system.

### Prompt
Now proceed to stage 9 build the dashboard and alert routes. Supervisor can see all tickets where agents can see tickets on which they are primary assignee or collaborator.

### What you got
Got the dashboard.js with postgres queries to get the tickets by status , priority , resolved this week and resolved in last 8 week with count of tickets breaching Sla or at risk of breaking it.

### What you corrected
Allowed agents to see the primary assignee of tickets on which they are collaborating. Everything else was working accordingly.

7. 
## <What you were trying to achieve>
Building the fronted and UI of our support ticking system.

### Prompt
Now proceed to stage 10 build the frontend of our system using React. Make it simple user friendly and must conatain all the functionality what we has tested so far. 

### What you got
Setup the fronted of our system. Setup the frontend using react vite and app.jsx , dashboard.jsx , navbar.jsx , TicketDetail.jsx etc. and run it locally. 

### What you corrected
Improved the UI and told to preserve the login state with route based url instead of port path.Tested the functionality of the UI components.






