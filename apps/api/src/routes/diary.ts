import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { diarySchema, diaryUpdateSchema } from '@shared';
import type { AppCtx } from '../ctx.js';
import { diaryEntries, taskCompletions } from '../db/schema.js';
import { assertCanView } from '../lib/authz.js';
import { badRequest, notFound, parseId } from '../lib/http.js';

export function diaryRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  r.get('/', (req, res) => {
    const userId = req.query.userId ? parseId(req.query.userId) : req.user.id;
    const access = assertCanView(db, req.user, userId);
    const conds = [eq(diaryEntries.userId, userId)];
    // Un Dom solo lee lo que su sum decidió compartir.
    if (access === 'dom') conds.push(eq(diaryEntries.visibility, 'shared'));
    const rows = db.select().from(diaryEntries).where(and(...conds)).orderBy(desc(diaryEntries.createdAt)).limit(200).all();
    res.json(rows);
  });

  r.post('/', (req, res) => {
    const input = diarySchema.parse(req.body);
    if (input.completionId) {
      const c = db.select().from(taskCompletions).where(eq(taskCompletions.id, input.completionId)).get();
      if (!c || c.userId !== req.user.id) throw badRequest('Entrega inválida');
    }
    const entry = db
      .insert(diaryEntries)
      .values({ userId: req.user.id, content: input.content, mood: input.mood ?? null, visibility: input.visibility, completionId: input.completionId ?? null })
      .returning()
      .get();
    res.status(201).json(entry);
  });

  r.patch('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const input = diaryUpdateSchema.parse(req.body);
    const updated = db
      .update(diaryEntries)
      .set(input)
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, req.user.id)))
      .returning()
      .get();
    if (!updated) throw notFound('Entrada no encontrada');
    res.json(updated);
  });

  r.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const result = db.delete(diaryEntries).where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, req.user.id))).run();
    if (result.changes === 0) throw notFound('Entrada no encontrada');
    res.json({ ok: true });
  });

  return r;
}
