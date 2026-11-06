import { and, eq, isNull, sql } from 'drizzle-orm';
import { localDate } from '@shared';
import type { DB } from '../db/index.js';
import { redemptions, rewards, taskCompletions, tasks, users } from '../db/schema.js';
import { prefsOf, savePrefs, type Notifier } from './notify.js';
import { buildTaskViews } from './tasks.js';

/** Ventana después de la hora elegida en la que aún se envía el recordatorio (por si el servidor estuvo caído). */
const WINDOW_MINUTES = 180;

function localMinutes(timeZone: string, at: Date): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(at)
    .split(':')
    .map(Number);
  return h * 60 + m;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Tareas que la persona todavía puede cumplir hoy. */
export function pendingTasksToday(db: DB, userId: number) {
  const list = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.assignedTo, userId), isNull(tasks.archivedAt)))
    .all();
  return buildTaskViews(db, list, userId).filter((t) => {
    if (t.ended) return false;
    const st = t.completion?.status;
    return !st || st === 'rejected';
  });
}

/** Entregas y canjes que esperan la revisión de un Dom. */
export function pendingReviews(db: DB, domId: number): number {
  const comps =
    db
      .select({ n: sql<number>`count(*)` })
      .from(taskCompletions)
      .innerJoin(tasks, eq(tasks.id, taskCompletions.taskId))
      .where(and(eq(tasks.createdBy, domId), eq(tasks.requiresApproval, true), eq(taskCompletions.status, 'pending')))
      .get()?.n ?? 0;
  const reds =
    db
      .select({ n: sql<number>`count(*)` })
      .from(redemptions)
      .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
      .where(and(eq(rewards.ownerId, domId), eq(redemptions.status, 'requested')))
      .get()?.n ?? 0;
  return comps + reds;
}

/**
 * Envía el recordatorio diario a quienes les toca en este momento.
 * Se llama cada minuto; nunca envía dos veces el mismo día local.
 */
export function runReminders(db: DB, notify: Notifier, now = new Date()): number {
  let sent = 0;
  for (const u of db.select().from(users).all()) {
    const prefs = prefsOf(db, u.id);
    if (!prefs.remindersEnabled) continue;
    const today = localDate(u.timezone, now);
    if (prefs.lastReminderDate === today) continue;
    const diff = localMinutes(u.timezone, now) - toMinutes(prefs.reminderTime);
    if (diff < 0 || diff > WINDOW_MINUTES) continue;

    // Se marca el día aunque no haya nada pendiente, para no revisar de nuevo hasta mañana.
    savePrefs(db, u.id, { lastReminderDate: today });

    if (u.role === 'dom') {
      const n = pendingReviews(db, u.id);
      if (!n) continue;
      notify(u.id, {
        kind: 'reminder',
        title: 'Tienes cosas por revisar',
        body: `${n} ${n === 1 ? 'entrega o canje espera' : 'entregas o canjes esperan'} tu revisión.`,
        discreetBody: `Tienes ${n} ${n === 1 ? 'pendiente' : 'pendientes'} hoy.`,
        url: '/revisar',
      });
    } else {
      const pending = pendingTasksToday(db, u.id);
      if (!pending.length) continue;
      const n = pending.length;
      const names = pending.slice(0, 3).map((t) => t.title).join(', ');
      notify(u.id, {
        kind: 'reminder',
        title: 'Tus rituales de hoy',
        body: `${n} ${n === 1 ? 'tarea pendiente' : 'tareas pendientes'}: ${names}${n > 3 ? '…' : ''}`,
        discreetBody: `Tienes ${n} ${n === 1 ? 'pendiente' : 'pendientes'} hoy.`,
        url: '/',
      });
    }
    sent++;
  }
  return sent;
}

/** Programa la revisión cada minuto. Devuelve una función para detenerla. */
export function startReminderLoop(db: DB, notify: Notifier): () => void {
  const tick = () => {
    try {
      runReminders(db, notify);
    } catch (err) {
      console.error('Error en recordatorios', err);
    }
  };
  const timer = setInterval(tick, 60_000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
