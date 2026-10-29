import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import type { AppCtx } from '../ctx.js';
import { redemptions, rewards, taskCompletions, tasks, users } from '../db/schema.js';
import { redactCompletion } from '../domain/tasks.js';

/** Bandeja del Dom: entregas por aprobar, canjes solicitados y recompensas propuestas. */
export function reviewRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  r.get('/', (req, res) => {
    const me = req.user;
    const completions = db
      .select({ completion: taskCompletions, task: tasks, userName: users.displayName })
      .from(taskCompletions)
      .innerJoin(tasks, eq(tasks.id, taskCompletions.taskId))
      .innerJoin(users, eq(users.id, taskCompletions.userId))
      .where(and(eq(tasks.createdBy, me.id), eq(tasks.requiresApproval, true), eq(taskCompletions.status, 'pending')))
      .orderBy(desc(taskCompletions.createdAt))
      .all()
      .map((x) => ({
        ...redactCompletion(x.completion, false),
        userName: x.userName,
        task: { id: x.task.id, title: x.task.title, points: x.task.points, type: x.task.type, difficulty: x.task.difficulty },
      }));

    const pendingRedemptions = db
      .select({ redemption: redemptions, title: rewards.title, icon: rewards.icon, userName: users.displayName })
      .from(redemptions)
      .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
      .innerJoin(users, eq(users.id, redemptions.userId))
      .where(and(eq(rewards.ownerId, me.id), eq(redemptions.status, 'requested')))
      .orderBy(desc(redemptions.createdAt))
      .all()
      .map((x) => ({ ...x.redemption, title: x.title, icon: x.icon, userName: x.userName }));

    const proposals = db
      .select({ reward: rewards, userName: users.displayName })
      .from(rewards)
      .innerJoin(users, eq(users.id, rewards.proposedBy))
      .where(and(eq(rewards.ownerId, me.id), eq(rewards.status, 'proposed')))
      .all()
      .map((x) => ({ ...x.reward, userName: x.userName }));

    res.json({ completions, redemptions: pendingRedemptions, proposals });
  });

  return r;
}
