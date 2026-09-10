const API_BASE = 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tickets${query ? `?${query}` : ''}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (ticket) => request('/tickets', { method: 'POST', body: ticket }),
  updateTicket: (id, fields) => request(`/tickets/${id}`, { method: 'PATCH', body: fields }),
  transitionTicket: (id, targetStatus) =>
    request(`/tickets/${id}/transition`, { method: 'POST', body: { targetStatus } }),
  addReply: (id, reply) => request(`/tickets/${id}/replies`, { method: 'POST', body: reply }),
  addCollaborator: (id, agentId) =>
    request(`/tickets/${id}/collaborators`, { method: 'POST', body: { agentId } }),
  removeCollaborator: (id, agentId) =>
    request(`/tickets/${id}/collaborators/${agentId}`, { method: 'DELETE' }),
  getTimeline: (id) => request(`/tickets/${id}/timeline`),
  getDashboard: () => request('/dashboard'),
  getAlerts: () => request('/alerts'),
  acknowledgeAlert: (ticketId) => request(`/alerts/${ticketId}/acknowledge`, { method: 'POST' }),
  bulkReassign: (ticketIds, agentId) =>
    request('/tickets/bulk/reassign', { method: 'POST', body: { ticketIds, agentId } }),
  bulkClose: (ticketIds) => request('/tickets/bulk/close', { method: 'POST', body: { ticketIds } }),
  getUsers: () => request('/users'),
};

export { getToken, setToken, clearToken };
