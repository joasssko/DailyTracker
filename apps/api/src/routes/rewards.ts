import { Router } from 'express';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { redemptionReviewSchema, rewardSchema, rewardUpdateSchema } from '@shared';
import type { AppCtx } from '../ctx.js';
import { redemptions, rewards, users } from '../db/schema.js';
import { activeDomOf, isDomOf } from '../lib/authz.js';
import { badRequest, conflict, forbidden, notFound, parseId } from '../lib/http.js';
import type { SessionUser } from '../lib/auth.js';
import { addPoints, balanceOf } from '../domain/points.js';
import type { DB } from '../db/index.js';

type Reward = typeof rewards.$inferSelect;

/** ¿Puede `user` ver (y canjear, si está activa) esta recompensa? */
function canSee(db: DB, user: SessionUser, reward: Reward) {
  if (reward.ownerId === user.id) return true;
  if (user.role !== 'sub' || activeDomOf(db, user.id) !== reward.ownerId) return false;
  if (reward.subId && reward.subId !== user.id) return false;
  return reward.status === 'active' || (reward.status === 'proposed' && reward.proposedBy === user.id);
}

export function rewardRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  r.get('/', (req, res) => {
    const me = req.user;
    if (me.role === 'sub') {
      const domId = activeDomOf(db, me.id);
      if (!domId) return void res.json([]);
      const list = db
        .select()
        .from(rewards)
        .where(
          and(
            eq(rewards.ownerId, domId),
            or(isNull(rewards.subId), eq(rewards.subId, me.id)),
            or(eq(rewards.status, 'active'), and(eq(rewards.status, 'proposed'), eq(rewards.proposedBy, me.id))),
          ),
        )
        .orderBy(rewards.cost)
        .all();
      return void res.json(list);
    }
    const statuses = req.query.archived === 'true' ? (['archived'] as const) : (['proposed', 'active'] as const);
    const list = db
      .select({ reward: rewards, subName: users.displayName })
      .from(rewards)
      .leftJoin(users, eq(users.id, rewards.subId))
      .where(and(eq(rewards.ownerId, me.id), inArray(rewards.status, [...statuses])))
      .orderBy(rewards.cost)
      .all();
    res.json(list.map((x) => ({ ...x.reward, subName: x.subName })));
  });

  r.post('/', (req, res) => {
    const me = req.user;
    const input = rewardSchema.parse(req.body);
    let ownerId = me.id;
    let subId = input.subId ?? null;
    let status: Reward['status'] = 'active';
    if (me.role === 'sub') {
      // El sum propone; su Dom la aprueba (y puede ajustar el costo).
      const domId = activeDomOf(db, me.id);
      if (!domId) throw badRequest('Necesitas un Dom vinculado para proponer recompensas');
      ownerId = domId;
      subId = me.id;
      status = 'proposed';
    } else if (me.role === 'dom') {
      if (subId && !isDomOf(db, me.id, subId)) throw forbidden('Esa persona no está a tu cargo');
    } else {
      subId = null;
    }
    const reward = db
      .insert(rewards)
      .values({ ownerId, subId, proposedBy: me.id, status, title: input.title, description: input.description, cost: input.cost, icon: input.icon })
      .returning()
      .get();
    res.status(201).json(reward);
  });

  r.patch('/:id', (req, res) => {
    const reward = db.select().from(rewards).where(eq(rewards.id, parseId(req.params.id))).get();
    if (!reward || reward.ownerId !== req.user.id) throw notFound('Recompensa no encontrada');
    const input = rewardUpdateSchema.parse(req.body);
    res.json(db.update(rewards).set(input).where(eq(rewards.id, reward.id)).returning().get());
  });

  r.post('/:id/redeem', (req, res) => {
    const me = req.user;
    const reward = db.select().from(rewards).where(eq(rewards.id, parseId(req.params.id))).get();
    if (!reward || !canSee(db, me, reward)) throw notFound('Recompensa no encontrada');
    if (reward.status !== 'active') throw badRequest('Esta recompensa aún no está disponible');
    if (me.role === 'dom') throw forbidden('Las recompensas las canjean tus sums');

    const redemption = db.transaction((tx) => {
      const t = tx as unknown as DB;
      const balance = balanceOf(t, me.id);
      if (balance < reward.cost) throw conflict(`Te faltan ${reward.cost - balance} puntos`);
      // Un switch se administra a sí mismo: su canje queda aprobado de inmediato.
      const status = reward.ownerId === me.id ? 'approved' : 'requested';
      const red = t.insert(redemptions).values({ rewardId: reward.id, userId: me.id, cost: reward.cost, status }).returning().get();
      addPoints(t, me.id, -reward.cost, 'redeem', `Canje: ${reward.title}`, red.id);
      return red;
    });
    res.status(201).json(redemption);
  });

  return r;
}

export function redemptionRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  // Canjes propios (sum/switch) o de mis sums (Dom).
  r.get('/', (req, res) => {
    const me = req.user;
    const where = me.role === 'dom' ? eq(rewards.ownerId, me.id) : eq(redemptions.userId, me.id);
    const rows = db
      .select({ redemption: redemptions, title: rewards.title, icon: rewards.icon, userName: users.displayName })
      .from(redemptions)
      .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
      .innerJoin(users, eq(users.id, redemptions.userId))
      .where(where)
      .orderBy(desc(redemptions.createdAt))
      .limit(100)
      .all();
    res.json(rows.map((x) => ({ ...x.redemption, title: x.title, icon: x.icon, userName: x.userName })));
  });

  r.post('/:id/review', (req, res) => {
    const red = db.select().from(redemptions).where(eq(redemptions.id, parseId(req.params.id))).get();
    if (!red) throw notFound('Canje no encontrado');
    const reward = db.select().from(rewards).where(eq(rewards.id, red.rewardId)).get()!;
    if (reward.ownerId !== req.user.id) throw notFound('Canje no encontrado');
    const { decision } = redemptionReviewSchema.parse(req.body);

    const allowed: Record<typeof decision, (typeof red.status)[]> = {
      approve: ['requested'],
      fulfill: ['requested', 'approved'],
      reject: ['requested', 'approved'],
    };
    if (!allowed[decision].includes(red.status)) throw conflict('Este canje ya fue resuelto');
    const status = ({ approve: 'approved', fulfill: 'fulfilled', reject: 'rejected' } as const)[decision];

    const updated = db.transaction((tx) => {
      const t = tx as unknown as DB;
      if (decision === 'reject') addPoints(t, red.userId, red.cost, 'refund', `Devolución: ${reward.title}`, red.id);
      return t.update(redemptions).set({ status, updatedAt: new Date().toISOString() }).where(eq(redemptions.id, red.id)).returning().get();
    });
    res.json(updated);
  });

  return r;
}
