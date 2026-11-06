import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, Gift, ListChecks, SunHorizon, X, type Icon } from '@phosphor-icons/react';
import type { NotificationKind } from '@shared';
import { api, useApiMutation } from '../lib/mutations';
import { relativeTime } from '../lib/format';
import { setAppBadge } from '../lib/push';
import type { AppNotification } from '../lib/types';

const ICONS: Record<NotificationKind, Icon> = {
  reminder: SunHorizon,
  task_assigned: ListChecks,
  task_completed: CheckCircle,
  task_reviewed: CheckCircle,
  reward_requested: Gift,
  reward_proposed: Gift,
  reward_reviewed: Gift,
  test: Bell,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const btn = useRef<HTMLButtonElement>(null);
  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: AppNotification[]; unread: number }>('/notifications'),
    refetchInterval: 60_000,
  });
  const unread = q.data?.unread ?? 0;
  const markRead = useApiMutation((ids?: number[]) => api('/notifications/read', { body: { ids } }));

  useEffect(() => setAppBadge(unread), [unread]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      btn.current?.focus();
    };
  }, [open]);

  function openItem(n: AppNotification) {
    if (!n.readAt) markRead.mutate([n.id]);
    setOpen(false);
    navigate(n.url);
  }

  return (
    <>
      <button
        ref={btn}
        className="bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Alertas: ${unread} sin leer` : 'Alertas'}
        aria-expanded={open}
      >
        <Bell size={21} weight={open ? 'regular' : 'light'} />
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open &&
        createPortal(
          <div className="bell-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
            <section className="bell-panel" role="dialog" aria-label="Alertas">
              <header className="bell-head">
                <h2>
                  Alertas{unread > 0 && <span className="faint small"> · {unread} sin leer</span>}
                </h2>
                <div className="row" style={{ gap: 14 }}>
                  {unread > 0 && (
                    <button className="link-btn" onClick={() => markRead.mutate(undefined)}>
                      Marcar todo leído
                    </button>
                  )}
                  <button className="btn ghost icon sm" onClick={() => setOpen(false)} aria-label="Cerrar">
                    <X size={15} />
                  </button>
                </div>
              </header>

              <div className="bell-list">
                {q.isLoading ? (
                  <p className="small muted" style={{ padding: 24 }}>
                    Cargando…
                  </p>
                ) : !q.data?.items.length ? (
                  <div className="bell-empty">
                    <p className="serif" style={{ fontSize: '1.5rem' }}>
                      Todo en calma.
                    </p>
                    <p className="small muted">Aquí verás tareas nuevas, entregas, revisiones y tu recordatorio diario.</p>
                  </div>
                ) : (
                  q.data.items.map((n) => {
                    const I = ICONS[n.kind] ?? Bell;
                    return (
                      <button key={n.id} className={`bell-item ${n.readAt ? '' : 'unread'}`} onClick={() => openItem(n)}>
                        <span className="bell-icon">
                          <I size={18} weight="light" />
                        </span>
                        <span className="grow">
                          <b>{n.title}</b>
                          <span className="bell-body">{n.body}</span>
                          <span className="tiny faint">{relativeTime(n.createdAt)}</span>
                        </span>
                        {!n.readAt && <span className="bell-dot" aria-label="Sin leer" />}
                      </button>
                    );
                  })
                )}
              </div>

              <footer className="bell-foot">
                <Link to="/perfil#notificaciones" className="link-btn" onClick={() => setOpen(false)}>
                  Ajustes de notificaciones →
                </Link>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
