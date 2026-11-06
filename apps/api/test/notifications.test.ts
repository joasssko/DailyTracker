import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { addDays, localDate } from '@shared';
import { createApp } from '../src/app.js';
import { createDb, type DB } from '../src/db/index.js';
import { pushSubscriptions, taskCompletions } from '../src/db/schema.js';
import { createNotifier, prefsOf, type PushPayload, type PushSender } from '../src/domain/notify.js';
import { runReminders } from '../src/domain/reminders.js';

const bonuses = { bronze: 20, silver: 50, gold: 100 };
let db: DB;
let app: ReturnType<typeof createApp>;
let sent: { endpoint: string; payload: PushPayload }[];
let jobs: Promise<unknown>[];
let goneEndpoints: Set<string>;
let notify: ReturnType<typeof createNotifier>;

const sender: PushSender = {
  publicKey: 'test-public-key',
  async send(sub, payload) {
    sent.push({ endpoint: sub.endpoint, payload });
    return { gone: goneEndpoints.has(sub.endpoint) };
  },
};
const flush = () => Promise.all(jobs);

async function user(username: string, role: 'dom' | 'sub' | 'switch') {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ username, email: `${username}@t.cl`, password: 'password123', displayName: username, role });
  return { agent, id: res.body.user.id as number };
}

async function pair() {
  const dom = await user('ama', 'dom');
  const sub = await user('lirio', 'sub');
  const inv = await dom.agent.post('/api/relationships/invites');
  await sub.agent.post('/api/relationships/join').send({ code: inv.body.inviteCode });
  return { dom, sub };
}

const subscribe = (agent: request.Agent, endpoint: string) =>
  agent.post('/api/notifications/subscriptions').send({ endpoint, keys: { p256dh: 'p', auth: 'a' } });

beforeEach(() => {
  db = createDb(':memory:');
  sent = [];
  jobs = [];
  goneEndpoints = new Set();
  notify = createNotifier(db, sender, (j) => jobs.push(j));
  app = createApp({ db, secret: 'test-secret-1234567890', bonuses, secureCookies: false, notify, push: sender });
});

describe('avisos de eventos', () => {
  it('asignar, completar y revisar avisa a la otra persona (buzón y push)', async () => {
    const { dom, sub } = await pair();
    await subscribe(sub.agent, 'https://push.test/sub');
    await subscribe(dom.agent, 'https://push.test/dom');

    const task = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Yoga', points: 25 });
    let inbox = await sub.agent.get('/api/notifications');
    expect(inbox.body.unread).toBe(1);
    expect(inbox.body.items[0]).toMatchObject({ kind: 'task_assigned', body: 'ama te asignó «Yoga».' });

    const c = await sub.agent.post(`/api/tasks/${task.body.id}/complete`).send({});
    expect((await dom.agent.get('/api/notifications')).body.items[0]).toMatchObject({ kind: 'task_completed', url: '/revisar' });

    await dom.agent.post(`/api/completions/${c.body.completion.id}/review`).send({ decision: 'approve' });
    inbox = await sub.agent.get('/api/notifications');
    expect(inbox.body.items[0]).toMatchObject({ kind: 'task_reviewed', title: 'Tarea aprobada' });

    await flush();
    expect(sent.map((s) => s.endpoint)).toEqual(['https://push.test/sub', 'https://push.test/dom', 'https://push.test/sub']);
  });

  it('el modo discreto (por defecto) no revela nombres ni títulos en el push', async () => {
    const { dom, sub } = await pair();
    await subscribe(sub.agent, 'https://push.test/sub');
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Algo íntimo' });
    await flush();
    expect(sent[0].payload).toMatchObject({ title: 'dailytracker ❣', body: 'Tienes una tarea nueva.' });
    expect(JSON.stringify(sent[0].payload)).not.toContain('íntimo');

    await sub.agent.put('/api/notifications/prefs').send({ discreet: false });
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Leer' });
    await flush();
    expect(sent[1].payload).toMatchObject({ title: 'Nueva tarea', body: 'ama te asignó «Leer».', unread: 2 });
  });

  it('un tipo desactivado no envía push, pero sí queda en el buzón', async () => {
    const { dom, sub } = await pair();
    await subscribe(sub.agent, 'https://push.test/sub');
    await sub.agent.put('/api/notifications/prefs').send({ notifyAssigned: false });
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Leer' });
    await flush();
    expect(sent).toHaveLength(0);
    expect((await sub.agent.get('/api/notifications')).body.unread).toBe(1);
  });

  it('canjes y propuestas avisan al Dom; su resolución avisa al sum', async () => {
    const { dom, sub } = await pair();
    await sub.agent.post('/api/rewards').send({ title: 'Desayuno', cost: 10 });
    expect((await dom.agent.get('/api/notifications')).body.items[0].kind).toBe('reward_proposed');

    const task = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Carta', points: 50 });
    const c = await sub.agent.post(`/api/tasks/${task.body.id}/complete`).send({});
    await dom.agent.post(`/api/completions/${c.body.completion.id}/review`).send({ decision: 'approve' });
    const reward = await dom.agent.post('/api/rewards').send({ title: 'Helado', cost: 20 });
    const red = await sub.agent.post(`/api/rewards/${reward.body.id}/redeem`);
    expect((await dom.agent.get('/api/notifications')).body.items[0].kind).toBe('reward_requested');
    await dom.agent.post(`/api/redemptions/${red.body.id}/review`).send({ decision: 'reject' });
    expect((await sub.agent.get('/api/notifications')).body.items[0]).toMatchObject({ kind: 'reward_reviewed', title: 'Canje rechazado' });
  });

  it('las suscripciones revocadas por el navegador se eliminan', async () => {
    const { dom, sub } = await pair();
    await subscribe(sub.agent, 'https://push.test/vieja');
    goneEndpoints.add('https://push.test/vieja');
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Leer' });
    await flush();
    expect(db.select().from(pushSubscriptions).all()).toHaveLength(0);
  });
});

describe('buzón y preferencias', () => {
  it('marcar como leído y validar la hora', async () => {
    const { dom, sub } = await pair();
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'A' });
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'B' });
    const inbox = await sub.agent.get('/api/notifications');
    const res = await sub.agent.post('/api/notifications/read').send({ ids: [inbox.body.items[0].id] });
    expect(res.body.unread).toBe(1);
    expect((await sub.agent.post('/api/notifications/read').send({})).body.unread).toBe(0);
    expect((await dom.agent.get('/api/notifications')).body.unread).toBe(0); // el buzón es propio

    expect((await sub.agent.put('/api/notifications/prefs').send({ reminderTime: '25:00' })).status).toBe(400);
    const prefs = await sub.agent.get('/api/notifications/prefs');
    expect(prefs.body).toMatchObject({ vapidPublicKey: 'test-public-key', devices: 0, prefs: { reminderTime: '09:00', discreet: true } });
  });
});

describe('recordatorio diario', () => {
  // 2026-07-15 09:30 en Santiago (UTC-4) = 13:30 UTC
  const at = (iso: string) => new Date(iso);

  it('avisa una sola vez al día, a la hora elegida, si hay pendientes', async () => {
    const { dom, sub } = await pair();
    await subscribe(sub.agent, 'https://push.test/sub');
    await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Agua', type: 'recurring' });
    const before = (await sub.agent.get('/api/notifications')).body.items.length;

    expect(runReminders(db, notify, at('2026-07-15T12:30:00Z'))).toBe(0); // 08:30: aún no
    runReminders(db, notify, at('2026-07-15T13:30:00Z')); // 09:30
    runReminders(db, notify, at('2026-07-15T13:45:00Z')); // mismo día: no repite
    await flush();
    const items = (await sub.agent.get('/api/notifications')).body.items;
    expect(items.length - before).toBe(1);
    expect(items[0]).toMatchObject({ kind: 'reminder', body: '1 tarea pendiente: Agua' });
    expect(sent.at(-1)!.payload.body).toBe('Tienes 1 pendiente hoy.');
    expect(prefsOf(db, sub.id).lastReminderDate).toBe('2026-07-15');
  });

  it('no avisa si ya cumplió todo o si lo desactivó', async () => {
    const { dom, sub } = await pair();
    const t = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Agua', type: 'recurring' });
    const today = localDate('America/Santiago');
    db.insert(taskCompletions).values({ taskId: t.body.id, userId: sub.id, localDate: today, status: 'pending' }).run();
    const now = new Date(`${today}T13:30:00Z`);
    runReminders(db, notify, now);
    expect((await sub.agent.get('/api/notifications')).body.items.filter((n: { kind: string }) => n.kind === 'reminder')).toHaveLength(0);

    await sub.agent.put('/api/notifications/prefs').send({ remindersEnabled: false });
    db.delete(taskCompletions).where(eq(taskCompletions.taskId, t.body.id)).run();
    runReminders(db, notify, new Date(`${addDays(today, 1)}T13:30:00Z`));
    expect((await sub.agent.get('/api/notifications')).body.items.filter((n: { kind: string }) => n.kind === 'reminder')).toHaveLength(0);
  });

  it('al Dom le recuerda lo que tiene por revisar', async () => {
    const { dom, sub } = await pair();
    const t = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Carta' });
    await sub.agent.post(`/api/tasks/${t.body.id}/complete`).send({});
    runReminders(db, notify, at('2026-07-15T13:30:00Z'));
    const items = (await dom.agent.get('/api/notifications')).body.items;
    expect(items[0]).toMatchObject({ kind: 'reminder', url: '/revisar' });
  });
});
