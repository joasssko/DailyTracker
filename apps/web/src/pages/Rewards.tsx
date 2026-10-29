import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { relativeTime } from '../lib/format';
import { useApiMutation } from '../lib/mutations';
import { useSession } from '../lib/session';
import type { LedgerRow, Redemption, Reward, SubSummary } from '../lib/types';
import { Empty, PageBand, SectionTitle, Spinner, Stat } from '../components/Bits';
import { Sheet } from '../components/Sheet';

const ICONS = ['🎁', '🍦', '🎬', '🥐', '📚', '🌹', '🛁', '🍷', '✈️', '🧸', '💆', '🍫'];
const STATUS: Record<Redemption['status'], { label: string; cls: string }> = {
  requested: { label: 'Solicitada', cls: 'dashed' },
  approved: { label: 'Aprobada', cls: 'blush' },
  fulfilled: { label: 'Entregada', cls: 'sage' },
  rejected: { label: 'Rechazada', cls: 'danger' },
};

export function RewardsPage() {
  const { user, balance, dom } = useSession();
  const isDom = user.role === 'dom';
  const isSub = user.role === 'sub';
  const [editing, setEditing] = useState<Reward | 'new' | null>(null);

  const rewards = useQuery({ queryKey: ['rewards'], queryFn: () => api<Reward[]>('/rewards') });
  const redemptions = useQuery({ queryKey: ['redemptions'], queryFn: () => api<Redemption[]>('/redemptions') });
  const ledger = useQuery({ queryKey: ['points', user.id], queryFn: () => api<{ history: LedgerRow[] }>('/points'), enabled: !isDom });
  const subs = useQuery({ queryKey: ['relationships'], queryFn: () => api<{ subs: SubSummary[] }>('/relationships'), enabled: isDom });

  const redeem = useApiMutation((r: Reward) => api(`/rewards/${r.id}/redeem`, { body: {} }), {
    success: isSub ? 'Canje solicitado. Tu Dom lo verá en su bandeja.' : '¡Disfrútalo!',
  });
  const fulfill = useApiMutation((id: number) => api(`/redemptions/${id}/review`, { body: { decision: 'fulfill' } }), { success: 'Marcada como entregada' });

  const active = (rewards.data ?? []).filter((r) => r.status === 'active');
  const proposed = (rewards.data ?? []).filter((r) => r.status === 'proposed');

  return (
    <>
      <PageBand
        eyebrow="Recompensas"
        title={isDom ? <>Lo que <em>se celebra</em></> : <>Ganadas con <em>constancia</em></>}
        lede={isDom ? 'Lo que tus sums pueden canjear con sus puntos.' : isSub ? 'Acordadas con tu Dom, desde un helado hasta un regalo especial.' : 'Date algo bonito por tu constancia.'}
        actions={
          (!isSub || dom) && (
            <button className="btn" onClick={() => setEditing('new')}>
              <Plus size={15} /> {isSub ? 'Proponer recompensa' : 'Nueva recompensa'}
            </button>
          )
        }
      >
        {!isDom && <Stat value={balance} label="puntos disponibles" />}
        <Stat value={active.length} label="recompensas activas" />
        <Stat value={(redemptions.data ?? []).filter((r) => r.status === 'fulfilled').length} label="entregadas" />
      </PageBand>

      <div className="page-body">
      <section className="section">
      <SectionTitle n={1} title="Disponibles" />
      <div style={{ marginTop: 28 }}>
      {rewards.isLoading ? (
        <Spinner />
      ) : active.length === 0 && proposed.length === 0 ? (
        <Empty title="Aún no hay recompensas">
          {isDom ? 'Crea la primera: desde “tomar un helado juntos” hasta un regalo especial.' : isSub ? (dom ? 'Propón una a tu Dom.' : 'Vincúlate con tu Dom para ver sus recompensas.') : 'Crea tu primera recompensa.'}
        </Empty>
      ) : (
        <div className="grid cols-auto">
          {[...active, ...proposed].map((r) => {
            const missing = Math.max(0, r.cost - balance);
            return (
              <article key={r.id} className="card reward">
                <div className="row between">
                  <span className="icon">{r.icon}</span>
                  {r.status === 'proposed' && <span className="tag dashed">Propuesta</span>}
                  {isDom && r.subName && <span className="tag">Solo {r.subName}</span>}
                </div>
                <div>
                  <h3>{r.title}</h3>
                  {r.description && <p className="small muted" style={{ marginTop: 4 }}>{r.description}</p>}
                </div>
                <span className="cost">{r.cost} puntos</span>
                {!isDom && r.status === 'active' && (
                  <>
                    <div className="progress-thin" aria-hidden>
                      <i style={{ width: `${Math.min(100, (balance / r.cost) * 100)}%` }} />
                    </div>
                    <button className="btn sm" disabled={missing > 0 || redeem.isPending} onClick={() => redeem.mutate(r)}>
                      {missing > 0 ? `Faltan ${missing}` : 'Canjear'}
                    </button>
                  </>
                )}
                {r.ownerId === user.id && (
                  <button className="btn ghost sm" onClick={() => setEditing(r)}>
                    Editar
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      </div>
      </section>

      <div className="layout-2 section">
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>{isDom ? 'Canjes de tus sums' : 'Mis canjes'}</h3>
          {redemptions.data?.length ? (
            redemptions.data.map((r) => (
              <div key={r.id} className="list-item">
                <span style={{ fontSize: '1.4rem' }}>{r.icon}</span>
                <div className="grow">
                  <p className="small" style={{ fontWeight: 600 }}>{r.title}</p>
                  <p className="tiny faint">
                    {isDom ? `${r.userName} · ` : ''}
                    {r.cost} puntos · {relativeTime(r.createdAt)}
                  </p>
                </div>
                <span className={`tag ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                {r.status === 'approved' && (isDom || user.role === 'switch') && (
                  <button className="btn sage sm" onClick={() => fulfill.mutate(r.id)}>
                    Entregada
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="small muted">Todavía no hay canjes.</p>
          )}
        </section>

        {!isDom && (
          <section className="card">
            <h3 style={{ marginBottom: 8 }}>Movimientos de puntos</h3>
            {ledger.data?.history.length ? (
              ledger.data.history.slice(0, 30).map((h) => (
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
              <p className="small muted">Cumple tareas para sumar tus primeros puntos.</p>
            )}
          </section>
        )}
      </div>

      </div>

      {editing && (
        <RewardSheet
          reward={editing === 'new' ? undefined : editing}
          proposing={isSub}
          subs={isDom ? (subs.data?.subs ?? []) : []}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function RewardSheet({ reward, proposing, subs, onClose }: { reward?: Reward; proposing: boolean; subs: SubSummary[]; onClose: () => void }) {
  const [title, setTitle] = useState(reward?.title ?? '');
  const [description, setDescription] = useState(reward?.description ?? '');
  const [cost, setCost] = useState(reward?.cost ?? 100);
  const [icon, setIcon] = useState(reward?.icon ?? '🎁');
  const [subId, setSubId] = useState<number | null>(reward?.subId ?? null);

  const save = useApiMutation(
    () =>
      reward
        ? api(`/rewards/${reward.id}`, { method: 'PATCH', body: { title, description, cost, icon } })
        : api('/rewards', { body: { title, description, cost, icon, subId } }),
    { success: proposing ? 'Propuesta enviada' : 'Recompensa guardada', onSuccess: onClose },
  );
  const archive = useApiMutation(() => api(`/rewards/${reward!.id}`, { method: 'PATCH', body: { status: 'archived' } }), {
    success: 'Recompensa archivada',
    onSuccess: onClose,
  });

  return (
    <Sheet
      title={reward ? 'Editar recompensa' : proposing ? 'Proponer recompensa' : 'Nueva recompensa'}
      subtitle={proposing ? 'Tu Dom la revisará y puede ajustar el costo.' : undefined}
      onClose={onClose}
    >
      <form
        className="stack lg"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        <div className="field">
          <span>Ícono</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {ICONS.map((i) => (
              <button type="button" key={i} className="option" aria-pressed={icon === i} onClick={() => setIcon(i)} style={{ padding: 8, width: 46 }}>
                <span className="emoji">{i}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Nombre</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ej: Tomar un helado juntos" />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} style={{ minHeight: 64 }} />
        </label>
        <div className="grid cols-2">
          <label className="field">
            <span>Costo en puntos</span>
            <input className="input" type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </label>
          {!reward && subs.length > 0 && (
            <label className="field">
              <span>Disponible para</span>
              <select className="select" value={subId ?? ''} onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Todos</option>
                {subs.map((s) => (
                  <option key={s.user.id} value={s.user.id}>
                    {s.user.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button className="btn block" disabled={save.isPending || !title.trim()}>
          {proposing ? 'Enviar propuesta' : 'Guardar'}
        </button>
        {reward && (
          <button type="button" className="btn ghost block" onClick={() => archive.mutate(undefined)}>
            Archivar
          </button>
        )}
      </form>
    </Sheet>
  );
}
