import { useState } from 'react';
import './index.css';
import { Login } from './Login';
import { NavBar } from './NavBar';
import { TicketList } from './TicketList';
import { TicketDetail } from './TicketDetail';
import { Dashboard } from './Dashboard';
import { Alerts } from './Alerts';
import { clearToken } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'tickets' | 'alerts' | 'ticket-detail'
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setView('dashboard');
  }

  function openTicket(id) {
    setSelectedTicketId(id);
    setView('ticket-detail');
  }

  function backToList() {
    setSelectedTicketId(null);
    setView('tickets');
  }

  return (
    <div>
      <NavBar view={view === 'ticket-detail' ? 'tickets' : view} setView={setView} user={user} onLogout={handleLogout} />

      {view === 'dashboard' && <Dashboard />}
      {view === 'tickets' && <TicketList user={user} onSelectTicket={openTicket} />}
      {view === 'alerts' && <Alerts onSelectTicket={openTicket} />}
      {view === 'ticket-detail' && (
        <TicketDetail ticketId={selectedTicketId} user={user} onBack={backToList} />
      )}
    </div>
  );
}

export default App;
