import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { joinSchema } from '@shared';
import type { AppCtx } from '../ctx.js';
import { diaryEntries, relationships, taskCompletions, tasks } from '../db/schema.js';
import { publicUser } from '../lib/auth.js';
import { activeDomOf, assertCanView, getUser } from '../lib/authz.js';
import { conflict, forbidden, notFound, parseId } from '../lib/http.js';
import { balanceOf } from '../domain/points.js';
import { buildTaskViews } from '../domain/tasks.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function inviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function relationshipRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  /** Resumen de una persona para su Dom: puntos, pendientes, último ánimo compartido y racha. */
  function subSummary(subId: number, domId: number) {
    const sub = getUser(db, subId);
    const subTasks = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.assignedTo, subId), eq(tasks.createdBy, domId), sql`${tasks.archivedAt} is null`))
      .all();
    const views = buildTaskViews(db, subTasks, domId);
    const pending = subTasks.length
      ? (db
          .select({ n: sql<number>`count(*)` })
          .from(taskCompletions)
          .where(
            and(
              inArray(
                taskCompletions.taskId,
                subTasks.map((t) => t.id),
              ),
              eq(taskCompletions.status, 'pending'),
            ),
          )
          .get()?.n ?? 0)
      : 0;
    const lastShared = db
      .select({ mood: diaryEntries.mood, createdAt: diaryEntries.createdAt })
      .from(diaryEntries)
      .where(and(eq(diaryEntries.userId, subId), eq(diaryEntries.visibility, 'shared')))
      .orderBy(desc(diaryEntries.createdAt))
      .get();
    const streaks = views.filter((v) => v.streak).map((v) => v.streak!.current);
    return {
      user: publicUser(sub),
      balance: balanceOf(db, subId),
      pendingReviews: pending,
      activeTasks: views.filter((v) => !v.ended && (v.type === 'recurring' || v.completion?.status !== 'approved')).length,
      doneToday: views.filter((v) => v.type === 'recurring' && v.completion && v.completion.status !== 'rejected').length,
      recurringCount: views.filter((v) => v.type === 'recurring' && !v.ended).length,
      bestStreak: streaks.length ? Math.max(...streaks) : 0,
      lastShared: lastShared ?? null,
    };
  }

  r.get('/', (req, res) => {
    const me = req.user;
    if (me.role === 'dom') {
      const rels = db
        .select()
        .from(relationships)
        .where(and(eq(relationships.domId, me.id), inArray(relationships.status, ['pending', 'active'])))
        .orderBy(desc(relationships.createdAt))
        .all();
      res.json({
        invites: rels.filter((x) => x.status === 'pending'),
        subs: rels.filter((x) => x.status === 'active').map((x) => ({ relationshipId: x.id, ...subSummary(x.subId!, me.id) })),
      });
      return;
    }
    if (me.role === 'sub') {
      const rel = db
        .select()
        .from(relationships)
        .where(and(eq(relationships.subId, me.id), eq(relationships.status, 'active')))
        .get();
      res.json({ relationship: rel ? { ...rel, dom: publicUser(getUser(db, rel.domId)) } : null });
      return;
    }
    res.json({});
  });

  r.get('/subs/:id', (req, res) => {
    const subId = parseId(req.params.id);
    if (assertCanView(db, req.user, subId) !== 'dom') throw forbidden();
    res.json(subSummary(subId, req.user.id));
  });

  r.post('/invites', (req, res) => {
    if (req.user.role !== 'dom') throw forbidden('Solo un Dom puede invitar');
    const rel = db.insert(relationships).values({ domId: req.user.id, inviteCode: inviteCode() }).returning().get();
    res.status(201).json(rel);
  });

  r.post('/join', (req, res) => {
    if (req.user.role !== 'sub') throw forbidden('Solo un sum puede unirse con un código');
    const { code } = joinSchema.parse(req.body);
    if (activeDomOf(db, req.user.id)) throw conflict('Ya tienes un Dom vinculado');
    const rel = db
      .select()
      .from(relationships)
      .where(and(eq(relationships.inviteCode, code.toUpperCase()), eq(relationships.status, 'pending')))
      .get();
    if (!rel) throw notFound('Código inválido o ya usado');
    const updated = db
      .update(relationships)
      .set({ subId: req.user.id, status: 'active' })
      .where(eq(relationships.id, rel.id))
      .returning()
      .get();
    res.json({ ...updated, dom: publicUser(getUser(db, updated.domId)) });
  });

  r.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const rel = db.select().from(relationships).where(eq(relationships.id, id)).get();
    if (!rel || (rel.domId !== req.user.id && rel.subId !== req.user.id)) throw notFound();
    if (rel.status === 'pending') db.delete(relationships).where(eq(relationships.id, id)).run();
    else db.update(relationships).set({ status: 'ended' }).where(eq(relationships.id, id)).run();
    res.json({ ok: true });
  });

  return r;
}

