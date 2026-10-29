import { useState } from 'react';
import { Check, Clock } from '@phosphor-icons/react';
import { FEELING_LABELS, type Feeling } from '@shared';
import { shortDate } from '../lib/format';
import { api, useApiMutation } from '../lib/mutations';
import type { TaskView } from '../lib/types';
import { CompleteSheet } from './CompleteSheet';
import { TaskFormSheet } from './TaskFormSheet';
import { DotCalendar, StreakProgress, WeekDots } from './Streak';

type Mode = 'assignee' | 'manager';

export function TaskCard({ task, mode, canShare = false, isSelf = false }: { task: TaskView; mode: Mode; canShare?: boolean; isSelf?: boolean }) {
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const c = task.completion;
  const status = c?.status ?? null;
  const done = status === 'approved';
  const pending = status === 'pending';
  const doer = mode === 'assignee' || isSelf;
  const canComplete = doer && !task.archivedAt && !task.ended && (!c || status === 'rejected');
  const manage = mode === 'manager' || isSelf;
  const feeling = c?.feeling ? FEELING_LABELS[c.feeling as Feeling] : null;
  const overdue = task.type === 'once' && task.dueDate && task.dueDate < task.today && !done;

  const archive = useApiMutation(() => api(`/tasks/${task.id}/${task.archivedAt ? 'unarchive' : 'archive'}`, { body: {} }), {
    success: task.archivedAt ? 'Tarea restaurada' : 'Tarea archivada',
  });

  return (
    <article className={`task ${done ? 'is-done' : ''}`}>
      <div style={{ minWidth: 0 }}>
        <h3 className="task-title">
          {task.title}
          <span className="pts-inline">+{task.points}</span>
        </h3>
        {task.description && <p className="task-desc">{task.description}</p>}

        <div className="task-meta">
          <span className={`tag ${task.type === 'recurring' ? 'fill' : ''}`}>{task.type === 'recurring' ? 'Diaria' : 'Una vez'}</span>
          <span className="tag">{task.difficulty === 'complex' ? 'Compleja' : 'Sencilla'}</span>
          {task.dueDate && (
            <span className={`tag ${overdue ? 'danger' : ''}`}>
              {task.type === 'recurring' ? 'Hasta' : 'Para el'} {shortDate(task.dueDate)}
            </span>
          )}
          {task.ended && <span className="tag">Terminada</span>}
          {pending && <span className="tag dashed">Esperando revisión</span>}
          {done && <span className="tag sage">{task.type === 'recurring' ? 'Aprobada hoy' : 'Cumplida'}</span>}
          {feeling && (
            <span className="tag blush">
              {feeling.emoji} {feeling.label}
            </span>
          )}
          {task.type === 'recurring' && <WeekDots task={task} />}
        </div>

        {status === 'rejected' && (
          <p className="review-note">
            No fue aprobada{c?.reviewNote ? `: “${c.reviewNote}”` : '.'} Puedes intentarlo de nuevo.
          </p>
        )}

        {task.type === 'recurring' && <StreakProgress task={task} />}

        {showCal && (
          <div style={{ marginTop: 18 }}>
            <DotCalendar task={task} />
          </div>
        )}

        {(task.type === 'recurring' || manage) && (
          <div className="task-actions">
            {task.type === 'recurring' && (
              <button className="link-btn" onClick={() => setShowCal((v) => !v)}>
                {showCal ? 'Ocultar calendario' : 'Calendario'}
              </button>
            )}
            {manage && !task.archivedAt && (
              <button className="link-btn" onClick={() => setEditing(true)}>
                Editar
              </button>
            )}
            {manage && (
              <button className="link-btn" onClick={() => archive.mutate(undefined)} disabled={archive.isPending}>
                {task.archivedAt ? 'Restaurar' : 'Archivar'}
              </button>
            )}
          </div>
        )}
      </div>

      {doer && !task.archivedAt && (
        <button
          className={`check-btn ${done ? 'done' : pending ? 'pending' : ''}`}
          disabled={!canComplete}
          onClick={() => setCompleting(true)}
          aria-label={done ? 'Cumplida' : pending ? 'Esperando revisión' : `Marcar "${task.title}" como hecha`}
        >
          {pending ? <Clock size={24} weight="light" /> : <Check size={24} weight={done ? 'bold' : 'light'} />}
        </button>
      )}

      {completing && <CompleteSheet task={task} canShare={canShare} onClose={() => setCompleting(false)} />}
      {editing && <TaskFormSheet task={task} onClose={() => setEditing(false)} />}
    </article>
  );
}
