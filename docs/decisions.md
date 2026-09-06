# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

- Chose: No customer portal or inbound email parsing. Customers continue to email us as before; agents manually transcribe correspondence into the ticket system.
- Rejected: A customer-facing login/portal, or automatic inbound email ingestion that would create/update tickets from incoming mail.
- Why: The assignment's 10 required goals only define two roles — agent and supervisor — and never mention a customer role. The stretch list's only email-related idea is an outbound daily digest, a different feature entirely. Inbound email ingestion is a subsystem on its own. Keeping email as a manual, human-mediated channel is a deliberate good for now.

## Decision 2

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 3

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 4

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 5

- **Chose:**
- **Rejected:**
- **Why:**
