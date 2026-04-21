import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const navItems = [
  { to: '/moderation', label: 'Moderation' },
  { to: '/content', label: 'Content' },
  { to: '/users', label: 'Users' },
  { to: '/settings', label: 'Settings' },
  { to: '/audit', label: 'Audit' },
];

export function AdminLayout() {
  const { session, logout } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Alpha Bucks</p>
          <h1>Admin Console</h1>
        </div>
        <div className="admin-header-meta">
          <p>{session?.username}</p>
          <p className="muted">{session?.role}</p>
          <button type="button" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="admin-nav" aria-label="Admin sections">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
