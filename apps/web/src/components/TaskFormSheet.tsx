import { useState } from 'react';
import { STREAK_THRESHOLDS, type Difficulty, type TaskType } from '@shared';
import { api, useApiMutation } from '../lib/mutations';
import type { TaskView, User } from '../lib/types';
import { Sheet } from './Sheet';

export function TaskFormSheet({
  task,
  assignees,
  defaultAssignee,
  onClose,
}: {
  task?: TaskView;
  assignees?: User[];
  defaultAssignee?: number;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [type, setType] = useState<TaskType>(task?.type ?? 'recurring');
  const [difficulty, setDifficulty] = useState<Difficulty>(task?.difficulty ?? 'simple');
  const [points, setPoints] = useState(task?.points ?? 10);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [assignedTo, setAssignedTo] = useState<number | undefined>(defaultAssignee ?? assignees?.[0]?.id);

  const save = useApiMutation(
    () => {
      const body = { title, description, difficulty, points: Number(points), dueDate: dueDate || null };
      return task
        ? api(`/tasks/${task.id}`, { method: 'PATCH', body })
        : api('/tasks', { body: { ...body, type, assignedTo } });
    },
    { success: task ? 'Tarea actualizada' : 'Tarea creada', onSuccess: onClose },
  );

  const t = STREAK_THRESHOLDS[difficulty];
  return (
    <Sheet title={task ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
      <form
        className="stack lg"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        {!task && assignees && assignees.length > 1 && (
          <label className="field">
            <span>Para</span>
            <select className="select" value={assignedTo} onChange={(e) => setAssignedTo(Number(e.target.value))}>
              {assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Título</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ej: Tomar 2 litros de agua" />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Detalles, intención, cómo saber que está cumplida…" style={{ minHeight: 72 }} />
        </label>

        {!task && (
          <div className="field">
            <span>Frecuencia</span>
            <div className="seg" role="group">
              <button type="button" aria-pressed={type === 'recurring'} onClick={() => setType('recurring')}>
                Diaria<small>genera rachas</small>
              </button>
              <button type="button" aria-pressed={type === 'once'} onClick={() => setType('once')}>
                Una vez<small>encargo puntual</small>
              </button>
            </div>
          </div>
        )}

        <div className="field">
          <span>Dificultad</span>
          <div className="seg" role="group">
            <button type="button" aria-pressed={difficulty === 'simple'} onClick={() => setDifficulty('simple')}>
              Sencilla
            </button>
            <button type="button" aria-pressed={difficulty === 'complex'} onClick={() => setDifficulty('complex')}>
              Compleja
            </button>
          </div>
          {(task?.type ?? type) === 'recurring' && (
            <span className="hint">
              Medallas: bronce a los {t.bronze} días, plata a los {t.silver}, oro a los {t.gold}.
            </span>
          )}
        </div>

        <div className="grid cols-2">
          <label className="field">
            <span>Puntos</span>
            <input className="input" type="number" min={0} max={10000} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>{(task?.type ?? type) === 'recurring' ? 'Termina el' : 'Para el'}</span>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <button className="btn block" disabled={save.isPending || !title.trim()}>
          {save.isPending ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </form>
    </Sheet>
  );
}
