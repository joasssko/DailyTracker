import { Router } from 'express';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { markReadSchema, notificationPrefsSchema, pushSubscriptionSchema } from '@shared';
import { z } from 'zod';
import type { AppCtx } from '../ctx.js';
import { notifications, pushSubscriptions } from '../db/schema.js';
import { prefsOf, savePrefs, unreadCount } from '../domain/notify.js';
import { badRequest } from '../lib/http.js';

export function notificationRoutes(ctx: AppCtx) {
  const { db } = ctx;
  const r = Router();

  // Buzón: últimos avisos y cantidad sin leer.
  r.get('/', (req, res) => {
    const items = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50)
      .all();
    res.json({ items, unread: unreadCount(db, req.user.id) });
  });

  r.post('/read', (req, res) => {
    const { ids } = markReadSchema.parse(req.body ?? {});
    const conds = [eq(notifications.userId, req.user.id), isNull(notifications.readAt)];
    if (ids?.length) conds.push(inArray(notifications.id, ids));
    db.update(notifications).set({ readAt: new Date().toISOString() }).where(and(...conds)).run();
    res.json({ unread: unreadCount(db, req.user.id) });
  });

  r.get('/prefs', (req, res) => {
    const { lastReminderDate: _omit, ...prefs } = prefsOf(db, req.user.id);
    const devices = db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, req.user.id)).all().length;
    res.json({ prefs, vapidPublicKey: ctx.push?.publicKey ?? null, devices });
  });

  r.put('/prefs', (req, res) => {
    const input = notificationPrefsSchema.parse(req.body);
    const { lastReminderDate: _omit, ...prefs } = savePrefs(db, req.user.id, input);
    res.json({ prefs });
  });

  // Registra (o reasigna) la suscripción push de este navegador.
  r.post('/subscriptions', (req, res) => {
    const { endpoint, keys } = pushSubscriptionSchema.parse(req.body);
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 300);
    db.insert(pushSubscriptions)
      .values({ userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent } })
      .run();
    res.status(201).json({ ok: true });
  });

  r.delete('/subscriptions', (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, req.user.id), eq(pushSubscriptions.endpoint, endpoint))).run();
    res.json({ ok: true });
  });

  r.post('/test', (req, res) => {
    if (!ctx.push) throw badRequest('Las notificaciones push no están disponibles en este servidor');
    ctx.notify(req.user.id, {
      kind: 'test',
      title: 'Notificación de prueba',
      body: 'Si ves esto, las notificaciones funcionan en este dispositivo ❣',
      discreetBody: 'Las notificaciones funcionan en este dispositivo.',
      url: '/perfil',
    });
    res.json({ ok: true });
  });

  return r;
}
