/**
 * Datos de demostración para desarrollo local. NO correr en producción.
 * Usuarios: ama (dom), lirio y nube (sums), sauce (switch). Contraseña de todos: cozy-demo-123
 */
import bcrypt from 'bcryptjs';
import { resolve } from 'node:path';
import { addDays, localDate } from '@shared';
import { loadConfig } from './config.js';
import { createDb, type DB } from './db/index.js';
import { diaryEntries, relationships, rewards, taskCompletions, tasks, users } from './db/schema.js';
import { reviewCompletion } from './domain/tasks.js';

const PASSWORD = 'cozy-demo-123';

export function seed(db: DB, bonuses = loadConfig().bonuses) {
  if (db.select().from(users).get()) {
    console.log('La base ya tiene usuarios; no se siembra nada.');
    return;
  }
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const mk = (username: string, displayName: string, role: 'dom' | 'sub' | 'switch') =>
    db.insert(users).values({ username, email: `${username}@demo.local`, passwordHash: hash, displayName, role }).returning().get();

  const ama = mk('ama', 'Ama', 'dom');
  const lirio = mk('lirio', 'Lirio', 'sub');
  const nube = mk('nube', 'Nube', 'sub');
  const sauce = mk('sauce', 'Sauce', 'switch');

  for (const [sub, code] of [[lirio, 'LIRIO001'], [nube, 'NUBE0001']] as const) {
    db.insert(relationships).values({ domId: ama.id, subId: sub.id, status: 'active', inviteCode: code }).run();
  }
  db.insert(relationships).values({ domId: ama.id, inviteCode: 'BIENVENI' }).run();

  const task = (createdBy: number, assignedTo: number, v: Partial<typeof tasks.$inferInsert> & { title: string }) =>
    db.insert(tasks).values({ createdBy, assignedTo, requiresApproval: createdBy !== assignedTo, ...v }).returning().get();

  const agua = task(ama.id, lirio.id, { title: 'Tomar 2 litros de agua', description: 'Botella llena en la mañana y otra en la tarde.', points: 10, difficulty: 'simple', type: 'recurring' });
  const yoga = task(ama.id, lirio.id, { title: 'Yoga 20 minutos', description: 'Antes de dormir, con la playlist que elegimos.', points: 25, difficulty: 'complex', type: 'recurring' });
  task(ama.id, lirio.id, { title: 'Escribir una carta a mano', description: 'Sobre lo que más disfrutaste esta semana.', points: 40, type: 'once', dueDate: addDays(localDate('America/Santiago'), 3) });
  const cama = task(ama.id, nube.id, { title: 'Hacer la cama al despertar', points: 5, difficulty: 'simple', type: 'recurring' });
  task(ama.id, nube.id, { title: 'Ordenar el escritorio', points: 20, type: 'once' });
  const leer = task(sauce.id, sauce.id, { title: 'Leer 15 páginas', points: 10, difficulty: 'simple', type: 'recurring' });

  const today = localDate('America/Santiago');
  const history = (t: typeof agua, userId: number, days: number, reviewer: number, feelings: string[] = []) => {
    for (let i = days; i >= 1; i--) {
      const c = db
        .insert(taskCompletions)
        .values({ taskId: t.id, userId, localDate: addDays(today, -i), feeling: feelings[i % (feelings.length || 1)] ?? null })
        .returning()
        .get();
      reviewCompletion(db, t, c, reviewer, 'approve', undefined, bonuses);
    }
  };
  history(agua, lirio.id, 11, ama.id, ['orgullo', 'calma']);
  history(yoga, lirio.id, 4, ama.id, ['entrega', 'dificultad', 'calma']);
  history(cama, nube.id, 2, ama.id);
  history(leer, sauce.id, 6, sauce.id, ['calma']);

  // Una entrega de hoy esperando revisión, con sensación compartida.
  db.insert(taskCompletions)
    .values({ taskId: yoga.id, userId: lirio.id, localDate: today, feeling: 'orgullo', feelingNote: 'Hoy por fin me salió la postura del cuervo.', feelingShared: true })
    .run();

  db.insert(rewards)
    .values([
      { ownerId: ama.id, proposedBy: ama.id, title: 'Tomar un helado juntos', cost: 60, icon: '🍦' },
      { ownerId: ama.id, proposedBy: ama.id, title: 'Noche de películas a tu elección', cost: 120, icon: '🎬' },
      { ownerId: ama.id, subId: lirio.id, proposedBy: ama.id, title: 'Regalo por 20 días tomando agua', cost: 300, icon: '🎁' },
      { ownerId: ama.id, subId: lirio.id, proposedBy: lirio.id, title: 'Desayuno en la cama', cost: 150, icon: '🥐', status: 'proposed' },
      { ownerId: sauce.id, proposedBy: sauce.id, title: 'Comprarme un libro nuevo', cost: 80, icon: '📚' },
    ])
    .run();

  db.insert(diaryEntries)
    .values([
      { userId: lirio.id, content: 'Me sentí muy acompañada hoy. Las tareas pequeñas me ordenan el día.', mood: 'bien', visibility: 'shared' },
      { userId: lirio.id, content: 'Nota solo para mí: quiero pedirle más rutinas de mañana.', mood: 'neutral', visibility: 'private' },
      { userId: sauce.id, content: 'Llevo casi una semana leyendo todos los días.', mood: 'radiante', visibility: 'private' },
    ])
    .run();

  console.log(`Datos de demostración listos. Usuarios: ama, lirio, nube, sauce — contraseña: ${PASSWORD}`);
}

if (process.argv[1]?.match(/seed\.(ts|js)$/)) {
  const config = loadConfig();
  seed(createDb(resolve(config.databasePath)), config.bonuses);
}
