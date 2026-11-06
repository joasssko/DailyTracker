import { and, eq, isNull, sql } from 'drizzle-orm';
import webpush from 'web-push';
import type { NotificationKind } from '@shared';
import type { DB } from '../db/index.js';
import { appSettings, notificationPrefs, notifications, pushSubscriptions } from '../db/schema.js';

export type Prefs = Omit<typeof notificationPrefs.$inferSelect, 'userId'>;

export const DEFAULT_PREFS: Prefs = {
  remindersEnabled: true,
  reminderTime: '09:00',
  discreet: true,
  notifyAssigned: true,
  notifyCompleted: true,
  notifyReviewed: true,
  notifyRewards: true,
  lastReminderDate: null,
};

export function prefsOf(db: DB, userId: number): Prefs {
  const row = db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).get();
  if (!row) return { ...DEFAULT_PREFS };
  const { userId: _u, ...prefs } = row;
  return prefs;
}

export function savePrefs(db: DB, userId: number, patch: Partial<Prefs>): Prefs {
  const next = { ...prefsOf(db, userId), ...patch };
  db.insert(notificationPrefs)
    .values({ userId, ...next })
    .onConflictDoUpdate({ target: notificationPrefs.userId, set: next })
    .run();
  return next;
}

/** Qué preferencia controla el push de cada tipo de aviso. */
const PREF_FOR: Record<NotificationKind, keyof Prefs | null> = {
  reminder: 'remindersEnabled',
  task_assigned: 'notifyAssigned',
  task_completed: 'notifyCompleted',
  task_reviewed: 'notifyReviewed',
  reward_requested: 'notifyRewards',
  reward_proposed: 'notifyRewards',
  reward_reviewed: 'notifyRewards',
  test: null,
};

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  unread: number;
}

/** Envía un push a una suscripción. `gone` indica que el navegador la revocó y hay que borrarla. */
export interface PushSender {
  readonly publicKey: string;
  send(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload): Promise<{ gone: boolean }>;
}

/**
 * Claves VAPID: se toman del entorno si existen; si no, se generan una vez y se guardan en la base
 * (así sobreviven a los redeploys sin configurar nada).
 */
export function createWebPushSender(db: DB, subject: string, envKeys?: { publicKey?: string; privateKey?: string }): PushSender {
  let keys = envKeys?.publicKey && envKeys.privateKey ? { publicKey: envKeys.publicKey, privateKey: envKeys.privateKey } : null;
  if (!keys) {
    const stored = db.select().from(appSettings).where(eq(appSettings.key, 'vapid')).get();
    if (stored) keys = JSON.parse(stored.value);
    else {
      keys = webpush.generateVAPIDKeys();
      db.insert(appSettings).values({ key: 'vapid', value: JSON.stringify(keys) }).run();
    }
  }
  const { publicKey, privateKey } = keys!;
  return {
    publicKey,
    async send(sub, payload) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 12, urgency: 'normal' },
        );
        return { gone: false };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return { gone: true };
        console.error('Error enviando push', status ?? err);
        return { gone: false };
      }
    },
  };
}

export function unreadCount(db: DB, userId: number): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .get()?.n ?? 0
  );
}

const DISCREET_TITLE = 'dailytracker ❣';

export interface NotifyInput {
  kind: NotificationKind;
  title: string;
  body: string;
  url?: string;
  /** Texto para la pantalla bloqueada en modo discreto (por defecto, uno genérico). */
  discreetBody?: string;
}

export type Notifier = (userId: number, input: NotifyInput) => void;

/**
 * Crea el notificador: guarda el aviso en el buzón (siempre) y envía push a los dispositivos
 * de la persona si tiene ese tipo de aviso activado. El push no bloquea la respuesta HTTP.
 */
export function createNotifier(db: DB, sender: PushSender | null, onSent?: (p: Promise<unknown>) => void): Notifier {
  return (userId, input) => {
    const row = db
      .insert(notifications)
      .values({ userId, kind: input.kind, title: input.title, body: input.body, url: input.url ?? '/' })
      .returning()
      .get();
    if (!sender) return;
    const prefs = prefsOf(db, userId);
    const pref = PREF_FOR[input.kind];
    if (pref && !prefs[pref]) return;
    const subs = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
    if (!subs.length) return;
    const payload: PushPayload = {
      title: prefs.discreet ? DISCREET_TITLE : input.title,
      body: prefs.discreet ? (input.discreetBody ?? 'Tienes una novedad esperándote.') : input.body,
      url: input.url ?? '/',
      tag: `dt-${input.kind}-${row.id}`,
      unread: unreadCount(db, userId),
    };
    const job = Promise.all(
      subs.map(async (s) => {
        const { gone } = await sender.send(s, payload);
        if (gone) db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id)).run();
      }),
    );
    onSent?.(job);
  };
}
