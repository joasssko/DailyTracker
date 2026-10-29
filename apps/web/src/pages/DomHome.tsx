import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Plus } from '@phosphor-icons/react';
import { MOOD_LABELS, type Mood } from '@shared';
import { api } from '../lib/api';
import { greeting, longToday, relativeTime } from '../lib/format';
import { useSession } from '../lib/session';
import type { Invite, ReviewInbox, SubSummary } from '../lib/types';
import { Avatar, Empty, PageBand, SectionTitle, Spinner, Stat } from '../components/Bits';
import { TaskFormSheet } from '../components/TaskFormSheet';
import { InvitesCard } from './Profile';

export function DomHomePage() {
  const { user } = useSession();
  const [creating, setCreating] = useState(false);
  const rels = useQuery({ queryKey: ['relationships'], queryFn: () => api<{ subs: SubSummary[]; invites: Invite[] }>('/relationships') });
  const inbox = useQuery({ queryKey: ['review'], queryFn: () => api<ReviewInbox>('/review') });
  const subs = rels.data?.subs ?? [];
  const pending = inbox.data ? inbox.data.completions.length + inbox.data.redemptions.length + inbox.data.proposals.length : 0;
  const doneToday = subs.reduce((n, s) => n + s.doneToday, 0);
  const totalRoutines = subs.reduce((n, s) => n + s.recurringCount, 0);

  return (
    <>
      <PageBand
        eyebrow={longToday()}
        title={
          <>
            {greeting()}, <em>{user.displayName}.</em>
          </>
        }
        actions={
          <>
            {pending > 0 && (
              <Link to="/revisar" className="btn blush" style={{ background: 'var(--surface)' }}>
                Revisar {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
              </Link>
            )}
            {subs.length > 0 && (
              <button className="btn" onClick={() => setCreating(true)}>
                <Plus size={15} /> Nueva tarea
              </button>
            )}
          </>
        }
      >
        <Stat value={subs.length} label={subs.length === 1 ? 'persona a tu cuidado' : 'personas a tu cuidado'} />
        <Stat value={`${doneToday}/${totalRoutines}`} label="rutinas registradas hoy" />
        <Stat value={pending} label="por revisar" />
      </PageBand>

      <div className="page-body">
        {rels.isLoading ? (
          <Spinner />
        ) : (
          <>
            <section className="section">
              <SectionTitle n={1} title="A tu cuidado" />
              {subs.length === 0 ? (
                <div style={{ marginTop: 24 }}>
                  <Empty title="Invita a tu primer sum">Genera un código y compártelo. Al ingresarlo desde su perfil, quedarán vinculados.</Empty>
                </div>
              ) : (
                <div className="grid cols-auto" style={{ marginTop: 28 }}>
                  {subs.map((s) => {
                    const mood = s.lastShared?.mood as Mood | null | undefined;
                    return (
                      <Link key={s.user.id} to={`/sums/${s.user.id}`} className="card interactive" style={{ padding: 26 }}>
                        <div className="row">
                          <Avatar name={s.user.displayName} />
                          <div className="grow">
                            <h3 style={{ fontSize: '1.9rem' }}>{s.user.displayName}</h3>
                            <p className="tiny faint">@{s.user.username}</p>
                          </div>
                          {s.pendingReviews > 0 && <span className="tag blush">{s.pendingReviews} por revisar</span>}
                        </div>
                        <div className="row" style={{ marginTop: 22, gap: 32, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
                          <Stat value={s.balance} label="puntos" />
                          <Stat value={s.bestStreak} label="racha activa" />
                          <Stat value={`${s.doneToday}/${s.recurringCount}`} label="hoy" />
                        </div>
                        <p className="small muted" style={{ marginTop: 16, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.05rem' }}>
                          {mood && MOOD_LABELS[mood]
                            ? `${MOOD_LABELS[mood].emoji} Se sintió “${MOOD_LABELS[mood].label.toLowerCase()}” · ${relativeTime(s.lastShared!.createdAt)}`
                            : 'Sin entradas compartidas todavía'}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="section">
              <SectionTitle n={2} title="Invitaciones" />
              <div style={{ marginTop: 24 }} className="narrow">
                <InvitesCard invites={rels.data?.invites ?? []} />
              </div>
            </section>
          </>
        )}
      </div>

      {creating && <TaskFormSheet assignees={subs.map((s) => s.user)} onClose={() => setCreating(false)} />}
    </>
  );
}
