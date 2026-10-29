import { Router } from 'express';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { completeSchema, reviewSchema, taskCreateSchema, taskUpdateSchema } from '@shared';
import type { AppCtx } from '../ctx.js';
import { taskCompletions, tasks } from '../db/schema.js';
import { assertCanView, assertTaskManager, getTask, isDomOf } from '../lib/authz.js';
import { badRequest, forbidden, notFound, parseId } from '../lib/http.js';
import { buildTaskViews, completeTask, redactCompletion, reviewCompletion } from '../domain/tasks.js';

export function taskRoutes(ctx: AppCtx) {
  const { db, bonuses } = ctx;
  const r = Router();

  // Lista de tareas de una persona (propia o de un sum a cargo).
  r.get('/', (req, res) => {
    const userId = req.query.userId ? parseId(req.query.userId) : req.user.id;
    assertCanView(db, req.user, userId);
    const archived = req.query.archived === 'true';
    const conds = [eq(tasks.assignedTo, userId), archived ? isNotNull(tasks.archivedAt) : isNull(tasks.archivedAt)];
    // Un Dom solo ve las tareas que él mismo asignó.
    if (userId !== req.user.id) conds.push(eq(tasks.createdBy, req.user.id));
    const list = db.select().from(tasks).where(and(...conds)).orderBy(desc(tasks.createdAt)).all();
    res.json(buildTaskViews(db, list, req.user.id));
  });

  r.post('/', (req, res) => {
    const me = req.user;
    const input = taskCreateSchema.parse(req.body);
    let assignedTo: number;
    if (me.role === 'dom') {
      if (!input.assignedTo) throw badRequest('Elige a quién asignar la tarea');
      if (!isDomOf(db, me.id, input.assignedTo)) throw forbidden('Esa persona no está a tu cargo');
      assignedTo = input.assignedTo;
    } else if (me.role === 'switch') {
      assignedTo = me.id;
    } else {
      throw forbidden('Las tareas las asigna tu Dom');
    }
    const task = db
      .insert(tasks)
      .values({
        createdBy: me.id,
        assignedTo,
        title: input.title,
        description: input.description,
        points: input.points,
        difficulty: input.difficulty,
        type: input.type,
        dueDate: input.dueDate ?? null,
        requiresApproval: assignedTo !== me.id,
      })
      .returning()
      .get();
    res.status(201).json(buildTaskViews(db, [task], me.id)[0]);
  });

  r.patch('/:id', (req, res) => {
    const task = getTask(db, parseId(req.params.id));
    assertTaskManager(req.user, task);
    const input = taskUpdateSchema.parse(req.body);
    const updated = db.update(tasks).set(input).where(eq(tasks.id, task.id)).returning().get();
    res.json(buildTaskViews(db, [updated], req.user.id)[0]);
  });

  r.post('/:id/archive', (req, res) => {
    const task = getTask(db, parseId(req.params.id));
    assertTaskManager(req.user, task);
    db.update(tasks).set({ archivedAt: new Date().toISOString() }).where(eq(tasks.id, task.id)).run();
    res.json({ ok: true });
  });

  r.post('/:id/unarchive', (req, res) => {
    const task = getTask(db, parseId(req.params.id));
    assertTaskManager(req.user, task);
    db.update(tasks).set({ archivedAt: null }).where(eq(tasks.id, task.id)).run();
    res.json({ ok: true });
  });

  r.post('/:id/complete', (req, res) => {
    const task = getTask(db, parseId(req.params.id));
    if (task.assignedTo !== req.user.id) throw forbidden('Esta tarea no está asignada a ti');
    const input = completeSchema.parse(req.body ?? {});
    const result = completeTask(db, task, req.user.id, input, bonuses);
    res.status(201).json({ ...result, task: buildTaskViews(db, [getTask(db, task.id)], req.user.id)[0] });
  });

  r.get('/:id/completions', (req, res) => {
    const task = getTask(db, parseId(req.params.id));
    const access = assertCanView(db, req.user, task.assignedTo);
    if (access === 'dom' && task.createdBy !== req.user.id) throw forbidden();
    const rows = db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.taskId, task.id))
      .orderBy(desc(taskCompletions.localDate))
      .all();
    res.json(rows.map((c) => redactCompletion(c, req.user.id === task.assignedTo)));
  });

  return r;
}

export function completionRoutes(ctx: AppCtx) {
  const { db, bonuses } = ctx;
  const r = Router();

  r.post('/:id/review', (req, res) => {
    const completion = db.select().from(taskCompletions).where(eq(taskCompletions.id, parseId(req.params.id))).get();
    if (!completion) throw notFound('Entrega no encontrada');
    const task = getTask(db, completion.taskId);
    assertTaskManager(req.user, task);
    const { decision, note } = reviewSchema.parse(req.body);
    res.json(reviewCompletion(db, task, completion, req.user.id, decision, note, bonuses));
  });

  // Sensaciones registradas al completar tareas (propias, o compartidas por un sum).
  r.get('/feelings', (req, res) => {
    const userId = req.query.userId ? parseId(req.query.userId) : req.user.id;
    const access = assertCanView(db, req.user, userId);
    const conds = [eq(taskCompletions.userId, userId), sql`(${taskCompletions.feeling} is not null or ${taskCompletions.feelingNote} != '')`];
    if (access === 'dom') conds.push(eq(taskCompletions.feelingShared, true), eq(tasks.createdBy, req.user.id));
    const rows = db
      .select({ completion: taskCompletions, taskTitle: tasks.title, taskId: tasks.id })
      .from(taskCompletions)
      .innerJoin(tasks, eq(tasks.id, taskCompletions.taskId))
      .where(and(...conds))
      .orderBy(desc(taskCompletions.createdAt))
      .limit(100)
      .all();
    res.json(rows.map((r) => ({ ...r.completion, taskTitle: r.taskTitle })));
  });

  return r;
}

