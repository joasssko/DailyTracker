import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  currentStreak,
  localDate,
  nextTier,
  runContaining,
  STREAK_THRESHOLDS,
  TIER_LABELS,
  TIERS,
  type Tier,
} from '@shared';
import type { DB } from '../db/index.js';
import { streakBadges, taskCompletions, tasks, users } from '../db/schema.js';
import { conflict, badRequest } from '../lib/http.js';
import { addPoints } from './points.js';

type Task = typeof tasks.$inferSelect;
type Completion = typeof taskCompletions.$inferSelect;

export type StreakBonuses = Record<Tier, number>;

export function timezoneOf(db: DB, userId: number): string {
  return db.select({ tz: users.timezone }).from(users).where(eq(users.id, userId)).get()?.tz ?? 'America/Santiago';
}

/**
 * Arma la vista de tareas para la UI: estado de hoy, racha vigente y medallas.
 * Una sola consulta de completions para todas las tareas.
 */
export function buildTaskViews(db: DB, list: Task[], viewerId: number) {
  if (list.length === 0) return [];
  const ids = list.map((t) => t.id);
  const comps = db
    .select()
    .from(taskCompletions)
    .where(inArray(taskCompletions.taskId, ids))
    .orderBy(desc(taskCompletions.localDate))
    .all();
  const badges = db.select().from(streakBadges).where(inArray(streakBadges.taskId, ids)).all();

  const byTask = new Map<number, Completion[]>();
  for (const c of comps) {
    const arr = byTask.get(c.taskId) ?? [];
    arr.push(c);
    byTask.set(c.taskId, arr);
  }

  const tzCache = new Map<number, string>();
  const tz = (uid: number) => {
    if (!tzCache.has(uid)) tzCache.set(uid, timezoneOf(db, uid));
    return tzCache.get(uid)!;
  };

  return list.map((t) => {
    const tc = byTask.get(t.id) ?? [];
    const today = localDate(tz(t.assignedTo));
    const approvedDates = tc.filter((c) => c.status === 'approved').map((c) => c.localDate);
    const latest = tc[0] ?? null;
    const todayComp = tc.find((c) => c.localDate === today) ?? null;
    const relevant = t.type === 'recurring' ? todayComp : latest;

    let streak = null;
    if (t.type === 'recurring') {
      const current = currentStreak(approvedDates, today);
      const taskBadges = badges.filter((b) => b.taskId === t.id);
      const highest = [...TIERS].reverse().find((tier) => taskBadges.some((b) => b.tier === tier)) ?? null;
      streak = {
        current,
        best: Math.max(t.bestStreak, current),
        next: nextTier(t.difficulty, current),
        thresholds: STREAK_THRESHOLDS[t.difficulty],
        highestTier: highest,
        badges: countTiers(taskBadges.map((b) => b.tier)),
      };
    }

    const ended = t.type === 'recurring' && !!t.dueDate && t.dueDate < today;
    return {
      ...t,
      today,
      ended,
      completion: relevant ? redactCompletion(relevant, viewerId === t.assignedTo) : null,
      recentDates: tc.slice(0, 60).map((c) => ({ date: c.localDate, status: c.status })),
      streak,
    };
  });
}

function countTiers(items: Tier[]) {
  const out: Record<Tier, number> = { bronze: 0, silver: 0, gold: 0 };
  for (const i of items) out[i]++;
  return out;
}

/** Oculta la sensación al Dom si el sum decidió no compartirla. */
export function redactCompletion(c: Completion, isOwner: boolean) {
  if (isOwner || c.feelingShared) return c;
  return { ...c, feeling: null, feelingNote: '' };
}

export function completeTask(
  db: DB,
  task: Task,
  userId: number,
  input: { feeling?: string | null; feelingNote: string; feelingShared: boolean },
  bonuses: StreakBonuses,
) {
  if (task.archivedAt) throw badRequest('La tarea está archivada');
  const today = localDate(timezoneOf(db, userId));
  if (task.type === 'recurring' && task.dueDate && task.dueDate < today) throw badRequest('Esta rutina ya terminó');

  return db.transaction((tx) => {
    const db = tx as unknown as DB;
    if (task.type === 'once') {
      const open = db
        .select()
        .from(taskCompletions)
        .where(and(eq(taskCompletions.taskId, task.id), inArray(taskCompletions.status, ['pending', 'approved'])))
        .get();
      if (open) throw conflict(open.status === 'approved' ? 'Esta tarea ya fue cumplida' : 'Ya está esperando revisión');
    }

    const existing = db
      .select()
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, task.id), eq(taskCompletions.localDate, today)))
      .get();
    if (existing && existing.status !== 'rejected') throw conflict('Ya registraste esta tarea hoy');

    const values = {
      status: 'pending' as const,
      feeling: input.feeling ?? null,
      feelingNote: input.feelingNote,
      feelingShared: input.feelingShared,
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    };

    let completion: Completion;
    if (existing) {
      completion = db.update(taskCompletions).set(values).where(eq(taskCompletions.id, existing.id)).returning().get();
    } else {
      completion = db
        .insert(taskCompletions)
        .values({ ...values, taskId: task.id, userId, localDate: today })
        .returning()
        .get();
    }

    // Tareas autoasignadas (switch) no necesitan aprobación.
    if (!task.requiresApproval) {
      return approve(db, task, completion, userId, null, bonuses);
    }
    return { completion, newBadges: [] as Tier[] };
  });
}

export function reviewCompletion(
  db: DB,
  task: Task,
  completion: Completion,
  reviewerId: number,
  decision: 'approve' | 'reject',
  note: string | undefined,
  bonuses: StreakBonuses,
) {
  if (completion.status !== 'pending') throw conflict('Esta entrega ya fue revisada');
  return db.transaction((tx) => {
    const db = tx as unknown as DB;
    if (decision === 'reject') {
      const updated = db
        .update(taskCompletions)
        .set({ status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note ?? null })
        .where(eq(taskCompletions.id, completion.id))
        .returning()
        .get();
      return { completion: updated, newBadges: [] as Tier[] };
    }
    return approve(db, task, completion, reviewerId, note ?? null, bonuses);
  });
}

/** Aprueba una entrega: suma puntos, recalcula la racha y entrega medallas nuevas. Debe correr en transacción. */
function approve(db: DB, task: Task, completion: Completion, reviewerId: number, note: string | null, bonuses: StreakBonuses) {
  const updated = db
    .update(taskCompletions)
    .set({ status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note })
    .where(eq(taskCompletions.id, completion.id))
    .returning()
    .get();

  addPoints(db, task.assignedTo, task.points, 'task', `Tarea cumplida: ${task.title}`, completion.id);

  const newBadges: Tier[] = [];
  if (task.type === 'recurring') {
    const dates = db
      .select({ d: taskCompletions.localDate })
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, task.id), eq(taskCompletions.status, 'approved')))
      .all()
      .map((r) => r.d);

    const run = runContaining(dates, completion.localDate);
    const thresholds = STREAK_THRESHOLDS[task.difficulty];
    for (const tier of TIERS) {
      if (run.length < thresholds[tier]) break;
      const inserted = db
        .insert(streakBadges)
        .values({ taskId: task.id, userId: task.assignedTo, tier, runStart: run.start, streakLen: thresholds[tier] })
        .onConflictDoNothing()
        .returning()
        .get();
      if (inserted) {
        newBadges.push(tier);
        addPoints(
          db,
          task.assignedTo,
          bonuses[tier],
          'streak_bonus',
          `Racha ${TIER_LABELS[tier].toLowerCase()} (${thresholds[tier]} días): ${task.title}`,
          inserted.id,
        );
      }
    }

    const today = localDate(timezoneOf(db, task.assignedTo));
    const current = currentStreak(dates, today);
    db.update(tasks)
      .set({ currentStreak: current, bestStreak: Math.max(task.bestStreak, run.length) })
      .where(eq(tasks.id, task.id))
      .run();
  }

  return { completion: updated, newBadges };
}
