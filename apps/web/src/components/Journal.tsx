import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { FEELING_LABELS, MOOD_LABELS, MOODS, type Feeling, type Mood } from '@shared';
import { relativeTime, shortDate } from '../lib/format';
import { api, useApiMutation } from '../lib/mutations';
import type { DiaryEntry, FeelingRow } from '../lib/types';
import { Empty, VisibilityChip } from './Bits';

export function DiaryComposer({ canShare }: { canShare: boolean }) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [shared, setShared] = useState(false);
  const save = useApiMutation(
    () => api('/diary', { body: { content, mood, visibility: canShare && shared ? 'shared' : 'private' } }),
    {
      success: 'Entrada guardada',
      onSuccess: () => {
        setContent('');
        setMood(null);
      },
    },
  );
  return (
    <form
      className="card stack"
      style={{ padding: 26 }}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(undefined);
      }}
    >
      <label className="field">
        <span className="sr-only">Escribe tu entrada</span>
        <textarea
          className="textarea"
          style={{ font: '400 1.35rem/1.5 var(--serif)', border: 0, padding: 0, minHeight: 120, boxShadow: 'none', background: 'transparent' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="¿Cómo estuvo tu día? ¿Qué sentiste?"
          maxLength={10000}
          required
        />
      </label>
      <div className="row wrap" role="group" aria-label="Ánimo" style={{ gap: 6 }}>
        {MOODS.map((m) => (
          <button
            type="button"
            key={m}
            className={`tag plain ${mood === m ? 'blush' : ''}`}
            aria-pressed={mood === m}
            onClick={() => setMood(mood === m ? null : m)}
            style={{ cursor: 'pointer', background: mood === m ? undefined : 'transparent' }}
          >
            {MOOD_LABELS[m].emoji} {MOOD_LABELS[m].label}
          </button>
        ))}
      </div>
      <div className="row between wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 4 }}>
        {canShare ? (
          <label className="row small" style={{ cursor: 'pointer' }}>
            <span className="toggle">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              <span />
            </span>
            {shared ? 'Compartida con mi Dom' : 'Solo para mí'}
          </label>
        ) : (
          <span className="small muted">Entrada privada</span>
        )}
        <button className="btn sm" disabled={save.isPending || !content.trim()}>
          Guardar entrada
        </button>
      </div>
    </form>
  );
}

export function EntryCard({ entry, editable, canShare = false }: { entry: DiaryEntry; editable: boolean; canShare?: boolean }) {
  const mood = entry.mood ? MOOD_LABELS[entry.mood as Mood] : null;
  const toggle = useApiMutation(
    () => api(`/diary/${entry.id}`, { method: 'PATCH', body: { visibility: entry.visibility === 'shared' ? 'private' : 'shared' } }),
    { success: entry.visibility === 'shared' ? 'Ahora es privada' : 'Ahora es compartida' },
  );
  const remove = useApiMutation(() => api(`/diary/${entry.id}`, { method: 'DELETE' }), { success: 'Entrada eliminada' });
  return (
    <article className="entry">
      <div className="row between">
        <span className="eyebrow">{relativeTime(entry.createdAt)}</span>
        {mood && (
          <span className="tag plain">
            {mood.emoji} {mood.label}
          </span>
        )}
      </div>
      <p className="entry-body">{entry.content}</p>
      <div className="entry-foot">
        <VisibilityChip visibility={entry.visibility} />
        {editable && (
          <div className="row" style={{ gap: 18 }}>
            {(canShare || entry.visibility === 'shared') && (
              <button className="link-btn" onClick={() => toggle.mutate(undefined)}>
                {entry.visibility === 'shared' ? 'Hacer privada' : 'Compartir'}
              </button>
            )}
            <button
              className="link-btn"
              aria-label="Eliminar entrada"
              onClick={() => confirm('¿Eliminar esta entrada? No se puede deshacer.') && remove.mutate(undefined)}
            >
              <Trash size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function FeelingList({ rows, emptyText }: { rows: FeelingRow[]; emptyText: string }) {
  if (!rows.length) return <Empty title="Sin sensaciones registradas">{emptyText}</Empty>;
  return (
    <div>
      {rows.map((r) => {
        const f = r.feeling ? FEELING_LABELS[r.feeling as Feeling] : null;
        return (
          <article key={r.id} className="entry">
            <div className="row between wrap">
              <span className="eyebrow">
                {shortDate(r.localDate)} · {r.taskTitle}
              </span>
              {f && (
                <span className="tag blush">
                  {f.emoji} {f.label}
                </span>
              )}
            </div>
            {r.feelingNote && <p className="entry-body">{r.feelingNote}</p>}
            <div className="entry-foot">
              <VisibilityChip visibility={r.feelingShared ? 'shared' : 'private'} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
