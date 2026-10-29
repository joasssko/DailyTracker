import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from '@phosphor-icons/react';
import { FEELING_LABELS, type Feeling } from '@shared';
import { api } from '../lib/api';
import { relativeTime, shortDate } from '../lib/format';
import { useApiMutation } from '../lib/mutations';
import type { ReviewInbox } from '../lib/types';
import { Avatar, Empty, PageBand, SectionTitle, Spinner, Stat } from '../components/Bits';
import { Sheet } from '../components/Sheet';

export function ReviewPage() {
  const inbox = useQuery({ queryKey: ['review'], queryFn: () => api<ReviewInbox>('/review') });
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const review = useApiMutation(
    ({ id, decision, note }: { id: number; decision: 'approve' | 'reject'; note?: string }) =>
      api(`/completions/${id}/review`, { body: { decision, note } }),
    { success: 'Entrega revisada' },
  );
  const redemption = useApiMutation(
    ({ id, decision }: { id: number; decision: 'approve' | 'reject' | 'fulfill' }) => api(`/redemptions/${id}/review`, { body: { decision } }),
    { success: 'Canje actualizado' },
  );
  const proposal = useApiMutation(
    ({ id, status, cost }: { id: number; status: 'active' | 'archived'; cost?: number }) =>
      api(`/rewards/${id}`, { method: 'PATCH', body: { status, cost } }),
    { success: 'Propuesta actualizada' },
  );

  if (inbox.isLoading) return <Spinner />;
  const d = inbox.data!;
  const empty = !d.completions.length && !d.redemptions.length && !d.proposals.length;

  return (
    <>
      <PageBand eyebrow="Bandeja" title={<>Por <em>revisar</em></>} lede="Aprueba entregas, entrega recompensas y responde propuestas.">
        <Stat value={d.completions.length} label="entregas" />
        <Stat value={d.redemptions.length} label="canjes" />
        <Stat value={d.proposals.length} label="propuestas" />
      </PageBand>

      <div className="page-body narrow" style={{ maxWidth: 900 }}>
      {empty && <Empty title="Todo al día">No hay nada esperando tu revisión.</Empty>}

      {d.completions.length > 0 && (
        <section className="stack section">
          <SectionTitle n={1} title="Entregas" />
          {d.completions.map((c) => {
            const f = c.feeling ? FEELING_LABELS[c.feeling as Feeling] : null;
            return (
              <article key={c.id} className="card">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={c.userName} />
                  <div className="grow">
                    <p className="small muted">
                      <b style={{ color: 'var(--ink)' }}>{c.userName}</b> · {shortDate(c.localDate)} · {relativeTime(c.createdAt)}
                    </p>
                    <h3 style={{ marginTop: 4, fontSize: '1.8rem' }}>{c.task.title}</h3>
                    <div className="task-meta">
                      <span className="tag">+{c.task.points} puntos</span>
                      {c.task.type === 'recurring' && <span className="tag fill">Diaria</span>}
                      {f && (
                        <span className="tag blush">
                          {f.emoji} {f.label}
                        </span>
                      )}
                    </div>
                    {c.feelingNote && <p className="entry-body" style={{ fontSize: '0.95rem' }}>“{c.feelingNote}”</p>}
                  </div>
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="btn ghost sm" onClick={() => setRejecting(c.id)}>
                    <X size={14} weight="bold" /> No aprobar
                  </button>
                  <button className="btn sage sm" disabled={review.isPending} onClick={() => review.mutate({ id: c.id, decision: 'approve' })}>
                    <Check size={14} weight="bold" /> Aprobar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {d.redemptions.length > 0 && (
        <section className="stack section">
          <SectionTitle n={2} title="Canjes solicitados" />
          {d.redemptions.map((r) => (
            <article key={r.id} className="card row">
              <span style={{ fontSize: '1.8rem' }}>{r.icon}</span>
              <div className="grow">
                <p style={{ fontWeight: 600 }}>{r.title}</p>
                <p className="small muted">
                  {r.userName} · {r.cost} puntos · {relativeTime(r.createdAt)}
                </p>
              </div>
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button className="btn ghost sm" onClick={() => redemption.mutate({ id: r.id, decision: 'reject' })}>
                  Rechazar
                </button>
                <button className="btn soft sm" onClick={() => redemption.mutate({ id: r.id, decision: 'approve' })}>
                  Aprobar
                </button>
                <button className="btn sage sm" onClick={() => redemption.mutate({ id: r.id, decision: 'fulfill' })}>
                  Entregada
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {d.proposals.length > 0 && (
        <section className="stack section">
          <SectionTitle n={3} title="Recompensas propuestas" />
          {d.proposals.map((p) => (
            <ProposalCard key={p.id} p={p} onDecide={(status, cost) => proposal.mutate({ id: p.id, status, cost })} />
          ))}
        </section>
      )}

      </div>

      {rejecting !== null && (
        <Sheet title="No aprobar entrega" subtitle="Una nota amable ayuda a intentarlo otra vez." onClose={() => setRejecting(null)}>
          <form
            className="stack lg"
            onSubmit={(e) => {
              e.preventDefault();
              review.mutate({ id: rejecting, decision: 'reject', note: note || undefined }, { onSuccess: () => { setRejecting(null); setNote(''); } });
            }}
          >
            <label className="field">
              <span>Nota (opcional)</span>
              <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </label>
            <button className="btn block">Enviar</button>
          </form>
        </Sheet>
      )}
    </>
  );
}

function ProposalCard({ p, onDecide }: { p: ReviewInbox['proposals'][number]; onDecide: (s: 'active' | 'archived', cost?: number) => void }) {
  const [cost, setCost] = useState(p.cost);
  return (
    <article className="card">
      <div className="row">
        <span style={{ fontSize: '1.8rem' }}>{p.icon}</span>
        <div className="grow">
          <p style={{ fontWeight: 600 }}>{p.title}</p>
          <p className="small muted">Propuesta de {p.userName}</p>
          {p.description && <p className="small" style={{ marginTop: 4 }}>{p.description}</p>}
        </div>
      </div>
      <div className="row wrap" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <label className="row small muted">
          Costo
          <input className="input" type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} style={{ width: 100, minHeight: 34 }} />
        </label>
        <button className="btn ghost sm" onClick={() => onDecide('archived')}>
          Descartar
        </button>
        <button className="btn sage sm" onClick={() => onDecide('active', cost)}>
          Aceptar
        </button>
      </div>
    </article>
  );
}
