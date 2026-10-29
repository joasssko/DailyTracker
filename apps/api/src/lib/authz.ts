import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { relationships, tasks, users } from '../db/schema.js';
import type { SessionUser } from './auth.js';
import { forbidden, notFound } from './http.js';

/** Id del Dom activo de un sum, o null. */
export function activeDomOf(db: DB, subId: number): number | null {
  const rel = db
    .select({ domId: relationships.domId })
    .from(relationships)
    .where(and(eq(relationships.subId, subId), eq(relationships.status, 'active')))
    .get();
  return rel?.domId ?? null;
}

export function isDomOf(db: DB, domId: number, subId: number): boolean {
  return activeDomOf(db, subId) === domId;
}

/**
 * Comprueba que `viewer` pueda ver los datos de `targetId`.
 * Devuelve 'self' si es la misma persona y 'dom' si es su Dom activo.
 */
export function assertCanView(db: DB, viewer: SessionUser, targetId: number): 'self' | 'dom' {
  if (viewer.id === targetId) return 'self';
  if (viewer.role === 'dom' && isDomOf(db, viewer.id, targetId)) return 'dom';
  throw forbidden();
}

export function getUser(db: DB, id: number) {
  const u = db.select().from(users).where(eq(users.id, id)).get();
  if (!u) throw notFound('Usuario no encontrado');
  return u;
}

export function getTask(db: DB, id: number) {
  const t = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!t) throw notFound('Tarea no encontrada');
  return t;
}

/** Quien creó la tarea (Dom o switch) puede editarla, archivarla y revisarla. */
export function assertTaskManager(viewer: SessionUser, task: typeof tasks.$inferSelect) {
  if (task.createdBy !== viewer.id) throw forbidden('Esta tarea no es tuya');
}
