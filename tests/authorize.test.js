const test = require('node:test');
const assert = require('node:assert/strict');
const authorize = require('../src/domain/authorize');

const agent1 = { id: 1, role: 'agent' };
const agent2 = { id: 2, role: 'agent' };
const agent3 = { id: 3, role: 'agent' }; // uninvolved third agent
const supervisor = { id: 99, role: 'supervisor' };

const ticketAssignedToAgent1 = { id: 500, primary_assignee_id: 1 };
const unclaimedTicket = { id: 501, primary_assignee_id: null };

test('supervisor can view, edit, reply, and transition any ticket', () => {
  assert.strictEqual(authorize.canView(supervisor, ticketAssignedToAgent1, []).ok, true);
  assert.strictEqual(authorize.canEdit(supervisor, ticketAssignedToAgent1, []).ok, true);
  assert.strictEqual(authorize.canReply(supervisor, ticketAssignedToAgent1, []).ok, true);
  assert.strictEqual(authorize.canTransition(supervisor, ticketAssignedToAgent1, []).ok, true);
});

test('the primary assignee can view, edit, and reply', () => {
  assert.strictEqual(authorize.canView(agent1, ticketAssignedToAgent1, []).ok, true);
  assert.strictEqual(authorize.canEdit(agent1, ticketAssignedToAgent1, []).ok, true);
  assert.strictEqual(authorize.canReply(agent1, ticketAssignedToAgent1, []).ok, true);
});

test('a collaborator (not the assignee) can view, edit, and reply', () => {
  const collaboratorIds = [2];
  assert.strictEqual(authorize.canView(agent2, ticketAssignedToAgent1, collaboratorIds).ok, true);
  assert.strictEqual(authorize.canEdit(agent2, ticketAssignedToAgent1, collaboratorIds).ok, true);
  assert.strictEqual(authorize.canReply(agent2, ticketAssignedToAgent1, collaboratorIds).ok, true);
});

test('an uninvolved agent cannot view, edit, or reply, and gets a reason', () => {
  const collaboratorIds = [2]; // agent3 is neither assignee nor collaborator
  const viewResult = authorize.canView(agent3, ticketAssignedToAgent1, collaboratorIds);
  assert.strictEqual(viewResult.ok, false);
  assert.ok(viewResult.reason.length > 0);

  assert.strictEqual(authorize.canEdit(agent3, ticketAssignedToAgent1, collaboratorIds).ok, false);
  assert.strictEqual(authorize.canReply(agent3, ticketAssignedToAgent1, collaboratorIds).ok, false);
});

test('an agent can claim an unclaimed ticket for themselves', () => {
  const result = authorize.canReassign(agent1, unclaimedTicket, 1);
  assert.strictEqual(result.ok, true);
});

test('an agent cannot claim an unclaimed ticket for someone else', () => {
  const result = authorize.canReassign(agent1, unclaimedTicket, 2);
  assert.strictEqual(result.ok, false);
});

test('an agent cannot reassign an already-claimed ticket away from the current assignee', () => {
  // agent1 (the assignee) tries to hand it to agent2
  const result = authorize.canReassign(agent1, ticketAssignedToAgent1, 2);
  assert.strictEqual(result.ok, false);
});

test('an agent cannot reassign a ticket away from themselves even to claim nothing changes', () => {
  // agent1 already owns it; trying to "reassign" to agent1 again is fine (no-op),
  // but confirming a THIRD agent cannot swoop in and claim an already-claimed ticket
  const result = authorize.canReassign(agent3, ticketAssignedToAgent1, 3);
  assert.strictEqual(result.ok, false);
});

test('a supervisor can reassign any ticket to any agent', () => {
  const result = authorize.canReassign(supervisor, ticketAssignedToAgent1, 2);
  assert.strictEqual(result.ok, true);
});

test('the assignee can add a collaborator', () => {
  const result = authorize.canAddCollaborator(agent1, ticketAssignedToAgent1, []);
  assert.strictEqual(result.ok, true);
});

test('an existing collaborator can add another collaborator', () => {
  const result = authorize.canAddCollaborator(agent2, ticketAssignedToAgent1, [2]);
  assert.strictEqual(result.ok, true);
});

test('an uninvolved agent cannot add a collaborator', () => {
  const result = authorize.canAddCollaborator(agent3, ticketAssignedToAgent1, [2]);
  assert.strictEqual(result.ok, false);
});

test('only a supervisor can remove a collaborator', () => {
  assert.strictEqual(authorize.canRemoveCollaborator(agent1).ok, false);
  assert.strictEqual(authorize.canRemoveCollaborator(supervisor).ok, true);
});

test('only a supervisor can perform bulk actions', () => {
  assert.strictEqual(authorize.canBulkAct(agent1).ok, false);
  assert.strictEqual(authorize.canBulkAct(supervisor).ok, true);
});

test('only the primary assignee (not a collaborator) can acknowledge an alert', () => {
  assert.strictEqual(authorize.canAcknowledgeAlert(agent1, ticketAssignedToAgent1).ok, true);
  assert.strictEqual(authorize.canAcknowledgeAlert(agent2, ticketAssignedToAgent1).ok, false); // agent2 is not the assignee here
  assert.strictEqual(authorize.canAcknowledgeAlert(supervisor, ticketAssignedToAgent1).ok, true);
});