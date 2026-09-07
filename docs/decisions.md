# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

Chose: No customer portal or inbound email parsing. Customers continue to email us as before; agents manually transcribe correspondence into the ticket system.

Rejected: A customer-facing login/portal, or automatic inbound email ingestion that would create/update tickets from incoming mail.

Why: The assignment's 10 required goals only define two roles — agent and supervisor — and never mention a customer role. The stretch list's only email-related idea is an outbound daily digest, a different feature entirely. Inbound email ingestion is a subsystem on its own. Keeping email as a manual, human-mediated channel is a deliberate good for now.

## Decision 2

Chose: Replies carry an is_internal flag (internal note vs. customer-visible), plus a distinct "Log customer reply" action that is separate from an agent's own outgoing reply, even though both are stored in the same replies table with is_internal = false.

Rejected: Treating any customer-visible reply as equivalent, with no distinct action for "this represents what the customer said."

Why: The spec requires a customer reply specifically to trigger the Pending→Open transition and resume the SLA clock. Since agents author every reply in this system (no customer accounts), the system has no way to know a reply is from the customer unless the agent explicitly marks it as such via a distinct action, distinct from an agent's own words to the customer.

## Decision 3

Chose: The SLA clock resumes at the system-generated timestamp of when the agent logs the customer's reply (created_at, immutable, not editable).

Rejected: A separate, agent-editable customer_replied_at field, backdatable to the real email time, used to drive the SLA calculation.

Why: There is no way to verify a backdated timestamp against anything (no email ingestion exists, per Decision 1), and the field would be filled in by the exact person whose performance it measures — a direct conflict of interest, gameable to make the agent's own SLA compliance look better. A system-generated timestamp is a known, honest, bounded approximation (worst case: understates real customer wait time by however long an agent's email-checking cadence is); a backdatable field is an unverifiable, unbounded one.

## Decision 4

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 5

- **Chose:**
- **Rejected:**
- **Why:**
