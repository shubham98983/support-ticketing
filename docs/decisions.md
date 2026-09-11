# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

Chose: No customer portal or inbound email parsing. Customers continue to email us as before. Agents manually transcribe correspondence into the ticket system.

Rejected: A customer-facing login/portal, or automatic inbound email ingestion that would create/update tickets from incoming mail.

Why: The assignment's 10 required goals only define two roles agent and supervisor and never mention a customer role. Inbound email ingestion is a subsystem on its own. Keeping email as a manual, human-mediated channel is a good for now.

## Decision 2

Chose: Replies carry an is_internal flag (internal note and customer-visible) plus a distinct "Log customer reply" action that is separate from an agent's own outgoing reply, even though both are stored in the same replies table with is_internal = false.

Rejected: Treating any customer-visible reply as equivalent, with no distinct action for "this represents what the customer said."

Why: The spec requires a customer reply specifically to trigger the Pending→Open transition and resume the SLA clock. Since agents author every reply in this system (no customer accounts), the system has no way to know a reply is from the customer unless the agent explicitly marks it as such via a distinct action.

## Decision 3

Chose: The SLA clock resumes at the system-generated timestamp of when the agent logs the customer's reply (created_at, immutable not editable).

Rejected: A separate agent-editable customer_replied_at field backdatable to the real email time, used to drive the SLA calculation.

Why: There is no way to verify a backdated timestamp against anything (no email ingestion exists, per Decision 1), and the field would be filled in by the exact person whose performance it measures - a direct conflict of interest to make the agent's own SLA compliance look better. A system-generated timestamp is a known, honest, bounded approximation (worst case: understates real customer wait time by however long an agent doesn't check his email) a backdatable field is an unverifiable unbounded one.

Later reversed: Initially proposed the backdatable customer_replied_at field as the more accurate option but then reversed once I recognized that unverifiable self-reported timestamps don't make the metric more accurate, they just make it easier to game while looking more precise.

## Decision 4

Chose: Any agent who is already primary assignee or an existing collaborator on a ticket can directly add another agent as a collaborator, with no approval step. A supervisor can add any agent as collaborator on any ticket, same way.

Rejected: A request/accept workflow where a proposed collaborator must approve before being added (would require a new collaboration_requests table its own small state machine, new authorization rules, and new UI).

Why: The spec says collaborators "can be added," with no mention of an approval step. A request/accept flow is a legitimate feature but is scope creep relative to the 10 required goals - it doesn't appear in the goals or the stretch list, and the assignment explicitly says not to build optional features at the expense of mandatory ones. Direct-add achieves the underlying need (an agent bringing in help) at a fraction of the implementation cost.

## Decision 5

Chose: Fixed SLA target response times per priority (urgent: 2h, high: 6h, normal: 12h, low: 24h) and a fixed 1-hour "at risk" window, both as hardcoded constants in src/domain/sla.js rather than configurable/stored values.

Rejected: A priority_sla_policy table making these numbers editable without a code change (this is explicitly listed as an optional stretch idea - "SLA policies that vary by priority" - not a required goal).

Why: The spec requires a target response time per priority to exist and be enforced, but doesn't require it to be configurable. Hardcoding keeps the required behavior fully correct. The specific numbers are an arbitrary placeholder.

## Decision 6

Chose: The dashboard's "resolved this week" count filters on tickets.resolved_at Timestamp instead of state.

Rejected: Filtering on current status = 'Resolved' (which would undercount since a resolved ticket that's since been formally closed would drop out of the count).

Why: A supervisor reading this number wants to know real throughput — how many problems actually got fixed this week — independent of how promptly agents formalize the paperwork afterward. resolved_at is the one timestamp in the schema that captures "solved," permanently, regardless of what happens to the ticket's status afterward.
