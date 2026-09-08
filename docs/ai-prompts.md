# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

1.
## <What you were trying to achieve>
Requirements analysis and architecture planning.

### Prompt
Act as a principal/senior software engineer with 20+ years of experience designing and shipping production web applications. I am giving you a assignment how would you have approached this. Compare different architecutre options , database schema etc. and discuss possible approaches and decisions.

### What you got
A full written analysis covering all of the above, recommending Node/Express/Postgres/React, with an explicit alternative-architectures comparison (including a Firebase/Supabase-as-backend option).

### What you corrected
Nothing needed correcting at this stage — used as the baseline plan, but several individual decisions inside it were revisited once I thought about them more concretely.


2.
## <What you were trying to achieve>
How to handle customer reply and how sla clock will be resumed.

### Prompt
How a customer's reply — sent by email, since there's no customer portal — should be captured and how it should resume the SLA clock, given the agent won't necessarily see the email the moment it arrives.

### What you got
Initially, a suggestion to add an agent-editable customer_replied_at field the agent could backdate to the real email time, framed as "more accurate" for the SLA calculation.

### What you corrected
This will allow the agent control the measurement, with no way to verify it against anything. He can fill the customer replied late and his response is on time. The AI agreed and reversed the recommendation to: the SLA clock resumes at the system-generated timestamp of when the agent logs the reply, full stop — no backdating field at all. This is documented as a reversed decision in docs/decisions.md (Decision 3).

3. 
## <What you were trying to achieve>
How to model the perfect lifecycle transition according to given in assignment as Ticket lifecycle.

### Prompt
Based on the given assignment generate the lifecycle.js file and model the ticket lifecycle exactly as defined in the assignment. Transition must follow the lifecycle flow given in the assignment.

### What you got
I got full ticket lifecycle transitions but few extra transitions which are not necessary or invalid. Like It allowed both states open and directly resolved from pending. And it also allowed a resolved to ticket to open which is not required.

### What you corrected
I made two changes to the lifecycle transitions. The Resolved → Open transition is not explicitly permitted by the assignment, so it has been removed. For Closed, the case can only be reopened within the fixed time window specified by the assignment. For Pending, the case cannot transition directly to Resolved; instead, we will wait for the customer to reply, during which time the clock remains paused. Once the customer responds, the case can transition only to Open.

4. 
## <What you were trying to achieve>
Wiring auth, ticket CRUD, and lifecycle routes.

### Prompt
Build the real Express routes on top of the already-tested domain modules: login, ticket and the lifecycle transition.

### What you got
src/routes/auth.js, src/middleware/requireAuth.js, and src/routes/tickets.js, all wired into server.js. Verified against the real Supabase database via curl, including both a valid and an invalid transition.

### What you corrected
Nothing much corrected this time. All the requirements of ticket creation are already stated and clear. It allowed the description to be NULL which i changed to NON-NULLABLE.

5. 
## <What you were trying to achieve>
Building replies, collaborators, and the timeline endpoint.

### Prompt
Everything working accordingly now build the reply-adding route including the specific rule that logging a customer reply while Pending should also resume the SLA clock, collaborator add/remove, and the ticket history/timeline endpoint.

### What you got
Got the reply-adding route, collaborator add/remove functionality, and ticket history/timeline endpoint implemented. The customer-reply flow also correctly resumes the SLA clock when a ticket is in Pending status.

### What you corrected
Here also requirements are clear so not much correction are needed. just reviewed the code andd tested the end point and by logging customer reply the ticket should move from pending->open.

6. 
## <What you were trying to achieve>
Building server-side search, filter, sort, and pagination

### Prompt
Everything working accordingly now build the reply-adding route including the specific rule that logging a customer reply while Pending should also resume the SLA clock, collaborator add/remove, and the ticket history/timeline endpoint.

### What you got
Got the reply-adding route, collaborator add/remove functionality, and ticket history/timeline endpoint implemented. The customer-reply flow also correctly resumes the SLA clock when a ticket is in Pending status.

### What you corrected
Here also requirements are clear so not much correction are needed. just reviewed the code andd tested the end point and by logging customer reply the ticket should move from pending->open.