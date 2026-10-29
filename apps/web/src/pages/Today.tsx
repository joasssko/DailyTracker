import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Plus } from '@phosphor-icons/react';
import { FEELING_LABELS, TIER_LABELS, type Feeling } from '@shared';
import { api } from '../lib/api';
import { greeting, longToday, relativeTime } from '../lib/format';
import { useSession } from '../lib/session';
import type { Badge, DiaryEntry, FeelingRow, TaskView } from '../lib/types';
import { TaskCard } from '../components/TaskCard';
import { TaskFormSheet } from '../components/TaskFormSheet';
import { Empty, Medal, PageBand, SectionTitle, Spinner, Stat } from '../components/Bits';
import { JoinCard } from './Profile';

export function TodayPage() {
  const { user, dom } = useSession();
  const isSwitch = user.role === 'switch';
  const [creating, setCreating] = useState(false);
  const tasks = useQuery({ queryKey: ['tasks', user.id], queryFn: () => api<TaskView[]>('/tasks') });
  const points = useQuery({ queryKey: ['points', user.id], queryFn: () => api<{ badges: Badge[] }>('/points') });
  const diary = useQuery({ queryKey: ['diary', user.id], queryFn: () => api<DiaryEntry[]>('/diary') });
  const feelings = useQuery({ queryKey: ['feelings', user.id], queryFn: () => api<FeelingRow[]>('/completions/feelings') });

  const list = tasks.data ?? [];
  const routines = list.filter((t) => t.type === 'recurring' && !t.ended);
  const open = list.filter((t) => t.type === 'once' && t.completion?.status !== 'approved');
  const finished = list.filter((t) => t.type === 'once' && t.completion?.status === 'approved').slice(0, 5);
  const doneToday = routines.filter((t) => t.completion && t.completion.status !== 'rejected').length;
  const bestStreak = Math.max(0, ...routines.map((t) => t.streak?.current ?? 0));
  const lastNote = feelings.data?.find((f) => f.feelingNote);
  const lastEntry = diary.data?.[0];

  return (
    <>
      <PageBand
        eyebrow={`${longToday()}${dom ? ` · Tu Dom: ${dom.displayName}` : ''}`}
        title={
          <>
            {greeting()}, <em>{user.displayName}.</em>
          </>
        }
        actions={
          isSwitch && (
            <button className="btn" onClick={() => setCreating(true)}>
              <Plus size={15} /> Nueva tarea
            </button>
          )
        }
      >
        <Stat value={`${doneToday}/${routines.length}`} label="rutinas registradas hoy" />
        <Stat value={bestStreak} label="días de racha más larga" />
        <Stat value={points.data?.badges.length ?? 0} label="medallas ganadas" />
        {lastNote && !isSwitch && <p className="band-quote">“{lastNote.feelingNote}”</p>}
      </PageBand>

      <div className="split-body">
        <div className="page-body">
          {user.role === 'sub' && !dom && (
            <div style={{ marginBottom: 40 }}>
              <JoinCard />
            </div>
          )}
          {tasks.isLoading ? (
            <Spinner />
          ) : (
            <>
              <section className="section">
                <SectionTitle n={1} title="Rutinas" count={`${routines.length} ${routines.length === 1 ? 'activa' : 'activas'}`} />
                {routines.length === 0 ? (
                  <div style={{ marginTop: 24 }}>
                    <Empty title="Sin rutinas por ahora">
                      {isSwitch ? 'Crea una tarea diaria para empezar una racha.' : 'Cuando tu Dom te asigne una rutina diaria aparecerá aquí.'}
                    </Empty>
                  </div>
                ) : (
                  routines.map((t) => <TaskCard key={t.id} task={t} mode="assignee" isSelf={isSwitch} canShare={!!dom} />)
                )}
              </section>

              <section className="section">
                <SectionTitle n={2} title="Encargos" count={`${open.length} ${open.length === 1 ? 'pendiente' : 'pendientes'}`} />
                {open.length === 0 ? (
                  <div style={{ marginTop: 24 }}>
                    <Empty title="Nada pendiente">Disfruta el momento.</Empty>
                  </div>
                ) : (
                  open.map((t) => <TaskCard key={t.id} task={t} mode="assignee" isSelf={isSwitch} canShare={!!dom} />)
                )}
              </section>

              {finished.length > 0 && (
                <section className="section">
                  <SectionTitle n={3} title="Cumplidas" />
                  {finished.map((t) => (
                    <TaskCard key={t.id} task={t} mode="assignee" isSelf={isSwitch} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>

        <aside className="panel">
          {lastEntry && (
            <div className="block">
              <p className="eyebrow">Tu última entrada</p>
              <div className="panel-quote">
                <q>{lastEntry.content.length > 160 ? `${lastEntry.content.slice(0, 160)}…` : lastEntry.content}</q>
                <small>
                  {lastEntry.visibility === 'shared' ? `Compartida${dom ? ` con ${dom.displayName}` : ''}` : 'Privada'} · {relativeTime(lastEntry.createdAt)}
                </small>
              </div>
            </div>
          )}

          <div className="block">
            <p className="eyebrow">Tus medallas</p>
            <h3>Constancia</h3>
            {points.data && points.data.badges.length > 0 ? (
              points.data.badges.slice(0, 5).map((b) => (
                <div key={b.id} className="panel-row">
                  <Medal tier={b.tier} size="md" />
                  <div>
                    <b>{b.taskTitle}</b>
                    <span>
                      {TIER_LABELS[b.tier]} · {b.streakLen} días seguidos
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="small muted">Cumple una rutina varios días seguidos para ganar tu primera medalla.</p>
            )}
          </div>

          {feelings.data && feelings.data.length > 0 && (
            <div className="block">
              <p className="eyebrow">Últimas sensaciones</p>
              <div className="row wrap" style={{ marginTop: 16, gap: 6 }}>
                {feelings.data.slice(0, 6).map((f) => {
                  const fl = f.feeling ? FEELING_LABELS[f.feeling as Feeling] : null;
                  return fl ? (
                    <span key={f.id} className="tag blush plain" title={f.taskTitle}>
                      {fl.emoji} {fl.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="block">
            <Link to="/journal" className="photo-card">
              <img src="/img/satin.jpg" alt="" />
              <div className="in">
                <p>
                  ¿Algo que quieras
                  <br />
                  dejar por escrito?
                </p>
                <span>Abrir mi diario →</span>
              </div>
            </Link>
          </div>
        </aside>
      </div>

      {creating && <TaskFormSheet onClose={() => setCreating(false)} />}
    </>
  );
}
