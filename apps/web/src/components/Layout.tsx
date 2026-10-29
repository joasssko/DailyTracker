import { Link, NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Gift, House, Notebook, SunHorizon, Tray, UserCircle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import type { ReviewInbox } from '../lib/types';

type Item = { to: string; label: string; icon: Icon; badge?: number };

export function Wordmark({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="wordmark">
      daily<i>tracker</i>
    </Link>
  );
}

export function Layout() {
  const { user, balance } = useSession();
  const isDom = user.role === 'dom';
  const inbox = useQuery({ queryKey: ['review'], queryFn: () => api<ReviewInbox>('/review'), enabled: isDom, refetchInterval: 60_000 });
  const pending = inbox.data ? inbox.data.completions.length + inbox.data.redemptions.length + inbox.data.proposals.length : 0;

  const items: Item[] = isDom
    ? [
        { to: '/', label: 'Inicio', icon: House },
        { to: '/revisar', label: 'Revisar', icon: Tray, badge: pending },
        { to: '/recompensas', label: 'Recompensas', icon: Gift },
        { to: '/journal', label: 'Diario', icon: Notebook },
        { to: '/perfil', label: 'Perfil', icon: UserCircle },
      ]
    : [
        { to: '/', label: 'Hoy', icon: SunHorizon },
        { to: '/journal', label: 'Diario', icon: Notebook },
        { to: '/recompensas', label: 'Recompensas', icon: Gift },
        { to: '/perfil', label: 'Perfil', icon: UserCircle },
      ];

  return (
    <div className="shell">
      <nav className="rail" aria-label="Principal">
        <Link to="/" className="mark" aria-label="Inicio">
           ❣
        </Link>
        {items.map(({ to, label, icon: I, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} title={label} aria-label={label} className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <I size={22} weight={isActive ? 'regular' : 'light'} />
                {!!badge && <span className="badge-dot">{badge}</span>}
              </>
            )}
          </NavLink>
        ))}
        <Link to="/perfil" className="me" title={user.displayName}>
          {user.displayName.charAt(0).toUpperCase()}
        </Link>
      </nav>

      <div className="content">
        <header className="topbar">
          <Wordmark />
          <nav className="toplinks" aria-label="Secciones">
            {items
              .filter((i) => i.to !== '/perfil')
              .map(({ to, label, badge }) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {label}
                  {!!badge && <span className="count">{badge}</span>}
                </NavLink>
              ))}
          </nav>
          {isDom ? (
            <Link to="/perfil" className="points-pill">
              {user.displayName}
            </Link>
          ) : (
            <Link to="/recompensas" className="points-pill">
              <b>{balance}</b> puntos
            </Link>
          )}
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Principal">
        {items.map(({ to, label, icon: I, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <I size={22} weight={isActive ? 'regular' : 'light'} />
                {label}
                {!!badge && <span className="badge-dot">{badge}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
