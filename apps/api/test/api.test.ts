import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { addDays, localDate } from '@shared';
import { createApp } from '../src/app.js';
import { createDb, type DB } from '../src/db/index.js';
import { taskCompletions } from '../src/db/schema.js';

const bonuses = { bronze: 20, silver: 50, gold: 100 };
let db: DB;
let app: ReturnType<typeof createApp>;

async function user(username: string, role: 'dom' | 'sub' | 'switch') {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ username, email: `${username}@t.cl`, password: 'password123', displayName: username, role });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user.id as number };
}

async function link(dom: Awaited<ReturnType<typeof user>>, sub: Awaited<ReturnType<typeof user>>) {
  const inv = await dom.agent.post('/api/relationships/invites');
  const res = await sub.agent.post('/api/relationships/join').send({ code: inv.body.inviteCode });
  expect(res.status).toBe(200);
}

beforeEach(() => {
  db = createDb(':memory:');
  app = createApp({ db, secret: 'test-secret-1234567890', bonuses, secureCookies: false });
});

describe('autenticación', () => {
  it('requiere sesión', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
  it('login con cookie httpOnly', async () => {
    await user('ana', 'sub');
    const res = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });
});

describe('sesión', () => {
  const maxAge = (res: request.Response) => Number(/Max-Age=(\d+)/.exec(res.headers['set-cookie'][0])![1]);

  it('sin "Recuérdame" dura 7 días y con él 180', async () => {
    await user('ana', 'sub');
    const corta = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'password123' });
    expect(maxAge(corta)).toBe(7 * 86400);
    const larga = await request(app).post('/api/auth/login').send({ username: 'ana', password: 'password123', remember: true });
    expect(maxAge(larga)).toBe(180 * 86400);
  });

  it('una sesión activa se renueva sola y conserva su duración', async () => {
    const { id } = await user('ana', 'sub');
    const iat = Math.floor(Date.now() / 1000) - 2 * 86400;
    const vieja = jwt.sign({ uid: id, rem: true, iat }, 'test-secret-1234567890', { expiresIn: '180d' });
    const res = await request(app).get('/api/auth/me').set('Cookie', `dt_session=${vieja}`);
    expect(res.status).toBe(200);
    expect(maxAge(res)).toBe(180 * 86400);
    // Una sesión recién creada no se reemite en cada petición.
    const fresca = jwt.sign({ uid: id, rem: true }, 'test-secret-1234567890', { expiresIn: '180d' });
    const res2 = await request(app).get('/api/auth/me').set('Cookie', `dt_session=${fresca}`);
    expect(res2.headers['set-cookie']).toBeUndefined();
  });
});

describe('permisos entre Dom y sum', () => {
  it('un Dom no puede asignar tareas ni leer el diario de un sum ajeno', async () => {
    const dom = await user('dom1', 'dom');
    const otro = await user('dom2', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    await sub.agent.post('/api/diary').send({ content: 'hola', visibility: 'shared' });

    const t = await otro.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'x' });
    expect(t.status).toBe(403);
    expect((await otro.agent.get(`/api/diary?userId=${sub.id}`)).status).toBe(403);
    expect((await otro.agent.get(`/api/points?userId=${sub.id}`)).status).toBe(403);
    expect((await dom.agent.get(`/api/diary?userId=${sub.id}`)).body).toHaveLength(1);
  });

  it('el Dom solo ve las entradas compartidas', async () => {
    const dom = await user('dom1', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    await sub.agent.post('/api/diary').send({ content: 'secreto', visibility: 'private' });
    await sub.agent.post('/api/diary').send({ content: 'para ti', visibility: 'shared' });
    const res = await dom.agent.get(`/api/diary?userId=${sub.id}`);
    expect(res.body.map((e: { content: string }) => e.content)).toEqual(['para ti']);
  });

  it('una sensación privada no aparece en la vista del Dom', async () => {
    const dom = await user('dom1', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    const task = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Agua', points: 10 });
    await sub.agent
      .post(`/api/tasks/${task.body.id}/complete`)
      .send({ feeling: 'nervios', feelingNote: 'solo mío', feelingShared: false });

    const inbox = await dom.agent.get('/api/review');
    expect(inbox.body.completions[0].feeling).toBeNull();
    expect(inbox.body.completions[0].feelingNote).toBe('');
    const mine = await sub.agent.get('/api/completions/feelings');
    expect(mine.body[0].feeling).toBe('nervios');
    const domFeelings = await dom.agent.get(`/api/completions/feelings?userId=${sub.id}`);
    expect(domFeelings.body).toHaveLength(0);
  });

  it('otro Dom no puede aprobar entregas ajenas', async () => {
    const dom = await user('dom1', 'dom');
    const otro = await user('dom2', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    const task = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Agua' });
    const c = await sub.agent.post(`/api/tasks/${task.body.id}/complete`).send({});
    const res = await otro.agent.post(`/api/completions/${c.body.completion.id}/review`).send({ decision: 'approve' });
    expect(res.status).toBe(403);
  });
});

describe('puntos y recompensas', () => {
  it('aprobar suma puntos; canjear falla sin saldo; rechazar reembolsa', async () => {
    const dom = await user('dom1', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    const task = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: 'Carta', points: 50 });
    const reward = await dom.agent.post('/api/rewards').send({ title: 'Helado', cost: 40 });
    const caro = await dom.agent.post('/api/rewards').send({ title: 'Viaje', cost: 500 });

    const c = await sub.agent.post(`/api/tasks/${task.body.id}/complete`).send({ feeling: 'orgullo' });
    expect((await sub.agent.post(`/api/rewards/${reward.body.id}/redeem`)).status).toBe(409); // aún sin puntos
    await dom.agent.post(`/api/completions/${c.body.completion.id}/review`).send({ decision: 'approve' });
    expect((await sub.agent.get('/api/points')).body.balance).toBe(50);

    expect((await sub.agent.post(`/api/rewards/${caro.body.id}/redeem`)).status).toBe(409);
    const red = await sub.agent.post(`/api/rewards/${reward.body.id}/redeem`);
    expect(red.status).toBe(201);
    expect((await sub.agent.get('/api/points')).body.balance).toBe(10);

    await dom.agent.post(`/api/redemptions/${red.body.id}/review`).send({ decision: 'reject' });
    expect((await sub.agent.get('/api/points')).body.balance).toBe(50);
  });

  it('el sum propone una recompensa y el Dom la activa', async () => {
    const dom = await user('dom1', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    const prop = await sub.agent.post('/api/rewards').send({ title: 'Desayuno', cost: 100 });
    expect(prop.body.status).toBe('proposed');
    expect((await dom.agent.get('/api/review')).body.proposals).toHaveLength(1);
    expect((await sub.agent.post(`/api/rewards/${prop.body.id}/redeem`)).status).toBe(400);
    await dom.agent.patch(`/api/rewards/${prop.body.id}`).send({ status: 'active', cost: 80 });
    const list = await sub.agent.get('/api/rewards');
    expect(list.body[0]).toMatchObject({ status: 'active', cost: 80 });
  });
});

describe('switch y rachas', () => {
  it('una rutina del switch suma puntos sin aprobación', async () => {
    const sw = await user('sauce', 'switch');
    const t = await sw.agent.post('/api/tasks').send({ title: 'Leer', points: 10, type: 'recurring' });
    const c = await sw.agent.post(`/api/tasks/${t.body.id}/complete`).send({});
    expect(c.body.completion.status).toBe('approved');
    expect((await sw.agent.get('/api/points')).body.balance).toBe(10);
    expect((await sw.agent.post(`/api/tasks/${t.body.id}/complete`).send({})).status).toBe(409); // una vez por día
  });

  it('una rutina compleja entrega bronce a los 3 días con bono', async () => {
    const sw = await user('sauce', 'switch');
    const t = await sw.agent.post('/api/tasks').send({ title: 'Yoga', points: 10, type: 'recurring', difficulty: 'complex' });
    const today = localDate('America/Santiago');
    // Dos días anteriores ya cumplidos (insertados como aprobados).
    for (const d of [addDays(today, -2), addDays(today, -1)]) {
      db.insert(taskCompletions).values({ taskId: t.body.id, userId: sw.id, localDate: d, status: 'approved' }).run();
    }
    const c = await sw.agent.post(`/api/tasks/${t.body.id}/complete`).send({});
    expect(c.body.newBadges).toEqual(['bronze']);
    expect(c.body.task.streak.current).toBe(3);
    expect(c.body.task.streak.next).toEqual({ tier: 'silver', remaining: 2 });
    expect((await sw.agent.get('/api/points')).body.balance).toBe(10 + bonuses.bronze);
  });

  it('un sum no puede crear tareas y no se limita el número de rutinas', async () => {
    const dom = await user('dom1', 'dom');
    const sub = await user('sub1', 'sub');
    await link(dom, sub);
    expect((await sub.agent.post('/api/tasks').send({ title: 'x' })).status).toBe(403);
    for (let i = 0; i < 3; i++) {
      const r = await dom.agent.post('/api/tasks').send({ assignedTo: sub.id, title: `r${i}`, type: 'recurring' });
      expect(r.status).toBe(201);
    }
  });
});
