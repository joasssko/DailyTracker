import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import type { AppCtx } from '../ctx.js';
import { pointLedger, streakBadges, tasks } from '../db/schema.js';
import { assertCanView } from '../lib/authz.js';
import { parseId } from '../lib/http.js';
import { balanceOf } from '../domain/points.js';

export function pointRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  r.get('/', (req, res) => {
    const userId = req.query.userId ? parseId(req.query.userId) : req.user.id;
    assertCanView(db, req.user, userId);
    const history = db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.userId, userId))
      .orderBy(desc(pointLedger.createdAt), desc(pointLedger.id))
      .limit(100)
      .all();
    const badges = db
      .select({ badge: streakBadges, taskTitle: tasks.title })
      .from(streakBadges)
      .innerJoin(tasks, eq(tasks.id, streakBadges.taskId))
      .where(eq(streakBadges.userId, userId))
      .orderBy(desc(streakBadges.createdAt))
      .all()
      .map((b) => ({ ...b.badge, taskTitle: b.taskTitle }));
    res.json({ balance: balanceOf(db, userId), history, badges });
  });

  return r;
}
