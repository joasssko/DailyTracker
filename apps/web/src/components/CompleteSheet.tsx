import { useState } from 'react';
import { FEELING_LABELS, FEELINGS, TIER_LABELS, type Feeling, type Tier } from '@shared';
import { api, useApiMutation } from '../lib/mutations';
import type { TaskView } from '../lib/types';
import { Medal } from './Bits';
import { Sheet } from './Sheet';

export function CompleteSheet({ task, canShare, onClose }: { task: TaskView; canShare: boolean; onClose: () => void }) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(true);
  const [badges, setBadges] = useState<Tier[] | null>(null);

  const complete = useApiMutation(
    () =>
      api<{ newBadges: Tier[] }>(`/tasks/${task.id}/complete`, {
        body: { feeling, feelingNote: note, feelingShared: canShare ? shared : false },
      }),
    {
      success: () => (task.requiresApproval ? 'Listo. Quedó esperando revisión 🤍' : `+${task.points} puntos`),
      onSuccess: (res) => (res.newBadges.length ? setBadges(res.newBadges) : onClose()),
    },
  );

  if (badges) {
    const top = badges[badges.length - 1];
    return (
      <Sheet title="Nueva medalla" onClose={onClose}>
        <div className="celebrate">
          <Medal tier={top} size="lg" label={task.streak?.thresholds[top]} />
          <h2>
            Racha de <em>{TIER_LABELS[top].toLowerCase()}</em>
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {task.title}: {task.streak?.thresholds[top]} días seguidos. Qué constancia tan bonita.
          </p>
          <button className="btn block" style={{ marginTop: 20 }} onClick={onClose}>
            Seguir
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="¿Cómo te sentiste?" subtitle={task.title} onClose={onClose}>
      <form
        className="stack lg"
        onSubmit={(e) => {
          e.preventDefault();
          complete.mutate(undefined);
        }}
      >
        <div className="option-grid" role="group" aria-label="Sensación">
          {FEELINGS.map((f) => (
            <button
              type="button"
              key={f}
              className="option"
              aria-pressed={feeling === f}
              onClick={() => setFeeling(feeling === f ? null : f)}
            >
              <span className="emoji">{FEELING_LABELS[f].emoji}</span>
              {FEELING_LABELS[f].label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Algo que quieras recordar (opcional)</span>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Lo que pasó, lo que sentiste, lo que aprendiste…" />
        </label>
        {canShare && (
          <label className="switch-row">
            <span>
              <b style={{ fontWeight: 600 }}>Compartir con mi Dom</b>
              <span className="small muted" style={{ display: 'block' }}>
                {shared ? 'Podrá leer tu sensación y nota.' : 'Solo tú la verás.'}
              </span>
            </span>
            <span className="toggle">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              <span />
            </span>
          </label>
        )}
        <button className="btn block" disabled={complete.isPending}>
          {complete.isPending ? 'Guardando…' : 'Marcar como hecha'}
        </button>
      </form>
    </Sheet>
  );
}
