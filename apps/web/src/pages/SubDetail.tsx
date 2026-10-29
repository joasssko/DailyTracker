import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Plus } from '@phosphor-icons/react';
import { TIER_LABELS } from '@shared';
import { api } from '../lib/api';
import { relativeTime } from '../lib/format';
import type { Badge, DiaryEntry, FeelingRow, LedgerRow, SubSummary, TaskView } from '../lib/types';
import { Empty, Medal, PageBand, SectionTitle, Spinner, Stat } from '../components/Bits';
import { TaskCard } from '../components/TaskCard';
import { TaskFormSheet } from '../components/TaskFormSheet';
import { EntryCard, FeelingList } from '../components/Journal';

type Tab = 'tasks' | 'diary' | 'feelings' | 'points';

export function SubDetailPage() {
  const id = Number(useParams().id);
  const [tab, setTab] = useState<Tab>('tasks');
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const summary = useQuery({ queryKey: ['sub', id], queryFn: () => api<SubSummary>(`/relationships/subs/${id}`) });
  const tasks = useQuery({ queryKey: ['tasks', id, archived], queryFn: () => api<TaskView[]>(`/tasks?userId=${id}${archived ? '&archived=true' : ''}`) });
  const diary = useQuery({ queryKey: ['diary', id], queryFn: () => api<DiaryEntry[]>(`/diary?userId=${id}`), enabled: tab === 'diary' });
  const feelings = useQuery({ queryKey: ['feelings', id], queryFn: () => api<FeelingRow[]>(`/completions/feelings?userId=${id}`), enabled: tab === 'feelings' });
  const points = useQuery({
    queryKey: ['points', id],
    queryFn: () => api<{ balance: number; history: LedgerRow[]; badges: Badge[] }>(`/points?userId=${id}`),
    enabled: tab === 'points',
  });

  if (summary.isLoading) return <Spinner />;
  if (!summary.data) return <div className="page-body"><Empty title="No encontramos a esta persona" /></div>;
  const s = summary.data;
  const routines = (tasks.data ?? []).filter((t) => t.type === 'recurring');
  const once = (tasks.data ?? []).filter((t) => t.type === 'once');

  return (
    <>
      <PageBand
        eyebrow={
          <Link to="/" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={11} /> A tu cuidado · @{s.user.username}
          </Link>
        }
        title={<em>{s.user.displayName}</em>}
        actions={
          <button className="btn" onClick={() => setCreating(true)}>
            <Plus size={15} /> Nueva tarea
          </button>
        }
      >
        <Stat value={s.balance} label="puntos" />
        <Stat value={`${s.doneToday}/${s.recurringCount}`} label="rutinas hoy" />
        <Stat value={s.bestStreak} label="racha activa más larga" />
        <Stat value={s.pendingReviews} label="por revisar" />
      </PageBand>

      <div className="page-body">
      <div className="seg tabs" role="tablist" style={{ marginBottom: 28 }}>
        {(
          [
            ['tasks', 'Tareas'],
            ['diary', 'Diario'],
            ['feelings', 'Sensaciones'],
            ['points', 'Puntos'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="stack lg">
          <label className="row small muted" style={{ cursor: 'pointer', alignSelf: 'flex-end', marginBottom: -12 }}>
            <span className="toggle">
              <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
              <span />
            </span>
            Ver archivadas
          </label>
          {tasks.isLoading ? (
            <Spinner />
          ) : !tasks.data?.length ? (
            <Empty title={archived ? 'No hay tareas archivadas' : 'Sin tareas asignadas'}>
              {!archived && 'Crea una rutina diaria o un encargo puntual.'}
            </Empty>
          ) : (
            <>
              {routines.length > 0 && (
                <section className="section">
                  <SectionTitle n={1} title="Rutinas" count={routines.length} />
                  {routines.map((t) => (
                    <TaskCard key={t.id} task={t} mode="manager" />
                  ))}
                </section>
              )}
              {once.length > 0 && (
                <section className="section">
                  <SectionTitle n={2} title="Encargos" count={once.length} />
                  {once.map((t) => (
                    <TaskCard key={t.id} task={t} mode="manager" />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'diary' && (
        <div className="narrow">
          {diary.isLoading ? (
            <Spinner />
          ) : diary.data?.length ? (
            diary.data.map((e) => <EntryCard key={e.id} entry={e} editable={false} />)
          ) : (
            <Empty title="Aún no hay entradas compartidas">Solo verás lo que decida compartir contigo.</Empty>
          )}
        </div>
      )}

      {tab === 'feelings' && (
        <div style={{ maxWidth: 720 }}>
          {feelings.isLoading ? <Spinner /> : <FeelingList rows={feelings.data ?? []} emptyText="Solo verás las sensaciones que decida compartir." />}
        </div>
      )}

      {tab === 'points' && (
        <div className="layout-2">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Movimientos</h3>
            {points.data?.history.length ? (
              points.data.history.map((h) => (
                <div key={h.id} className="list-item">
                  <div className="grow">
                    <p className="small">{h.reason}</p>
                    <p className="tiny faint">{relativeTime(h.createdAt)}</p>
                  </div>
                  <b style={{ color: h.amount > 0 ? 'var(--sage-ink)' : 'var(--accent-ink)' }}>
                    {h.amount > 0 ? '+' : ''}
                    {h.amount}
                  </b>
                </div>
              ))
            ) : (
              <p className="small muted">Sin movimientos todavía.</p>
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Medallas</h3>
            {points.data?.badges.length ? (
              points.data.badges.map((b) => (
                <div key={b.id} className="list-item">
                  <Medal tier={b.tier} size="md" />
                  <div className="grow">
                    <p className="small" style={{ fontWeight: 600 }}>{b.taskTitle}</p>
                    <p className="tiny muted">
                      {TIER_LABELS[b.tier]} · {b.streakLen} días
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="small muted">Aún sin medallas.</p>
            )}
          </div>
        </div>
      )}

      </div>

      {creating && <TaskFormSheet assignees={[s.user]} defaultAssignee={s.user.id} onClose={() => setCreating(false)} />}
    </>
  );
}
