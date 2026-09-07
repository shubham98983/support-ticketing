// Authorization — pure functions only. No database, no HTTP.
// Every function takes plain data (the acting user, the ticket, and — where
// relevant — the list of collaborator agent ids already fetched from the
// database by the caller) and returns { ok, reason }, matching the shape
// used by src/domain/lifecycle.js for consistency.
//
// This file only answers "is this actor allowed to do this to this ticket."
// It never answers "is this a legal state transition" — that's lifecycle.js.
// A route handler must check BOTH before actually doing anything.

function isCollaborator(user, collaboratorIds) {
  return collaboratorIds.includes(user.id);
}

function isAssignee(user, ticket) {
  return ticket.primary_assignee_id === user.id;
}

function isOnTicket(user, ticket, collaboratorIds) {
  return isAssignee(user, ticket) || isCollaborator(user, collaboratorIds);
}

/** Can this user view this ticket at all? */
function canView(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Not authorized to view this ticket.' };
}

/** Can this user edit ticket fields (subject, description, priority, category)? */
function canEdit(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Only the assignee, a collaborator, or a supervisor can edit this ticket.' };
}

/** Can this user add a reply (internal note, agent reply, or logged customer reply)? */
function canReply(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Only the assignee, a collaborator, or a supervisor can reply to this ticket.' };
}

/** Can this user attempt a lifecycle transition (New/Open/Pending/Resolved/Closed)? */
function canTransition(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Only the assignee, a collaborator, or a supervisor can change this ticket\u2019s status.' };
}

/** Can this user archive or restore this ticket? */
function canArchive(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Only the assignee, a collaborator, or a supervisor can archive this ticket.' };
}

/** Can this user add `newCollaboratorId` as a collaborator on this ticket? */
function canAddCollaborator(user, ticket, collaboratorIds) {
  if (user.role === 'supervisor') return { ok: true };
  if (isOnTicket(user, ticket, collaboratorIds)) return { ok: true };
  return { ok: false, reason: 'Only the assignee, a collaborator, or a supervisor can add a collaborator.' };
}

/** Can this user remove `existingCollaboratorId` from this ticket? */
function canRemoveCollaborator(user) {
  if (user.role === 'supervisor') return { ok: true };
  return { ok: false, reason: 'Only a supervisor can remove a collaborator.' };
}

/**
 * Can this user set the ticket's primary_assignee_id to `targetAgentId`?
 * Agents may only claim an unclaimed ticket for themselves — never move a
 * ticket away from themselves, and never hand it to a third party. Any
 * other reassignment is supervisor-only.
 */
function canReassign(user, ticket, targetAgentId) {
  if (user.role === 'supervisor') return { ok: true };

  const isSelfClaim = targetAgentId === user.id;
  const isCurrentlyUnclaimed = ticket.primary_assignee_id === null;

  if (isSelfClaim && isCurrentlyUnclaimed) return { ok: true };

  if (targetAgentId !== user.id) {
    return { ok: false, reason: 'Agents cannot reassign a ticket to someone else — only a supervisor can.' };
  }

  return { ok: false, reason: 'Agents can only claim an unclaimed ticket for themselves.' };
}

/** Can this user perform a bulk action (bulk reassign / bulk close)? */
function canBulkAct(user) {
  if (user.role === 'supervisor') return { ok: true };
  return { ok: false, reason: 'Bulk actions are supervisor-only.' };
}

/** Can this user acknowledge an alert for this ticket? */
function canAcknowledgeAlert(user, ticket) {
  if (user.role === 'supervisor') return { ok: true };
  if (isAssignee(user, ticket)) return { ok: true };
  return { ok: false, reason: 'Only the primary assignee can acknowledge an alert for this ticket.' };
}

module.exports = {
  isAssignee,
  isCollaborator,
  isOnTicket,
  canView,
  canEdit,
  canReply,
  canTransition,
  canArchive,
  canAddCollaborator,
  canRemoveCollaborator,
  canReassign,
  canBulkAct,
  canAcknowledgeAlert,
};