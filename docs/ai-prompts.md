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
A full written analysis covering all of the above, recommending Node/Express/Postgres/React, with an explicit alternative-architectures comparison (including a Firebase/Supabase-as-backend option that was explicitly rejected for conflicting with the assignment's own principle that authorization and business logic belong server-side).

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


