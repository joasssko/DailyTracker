import { resolve } from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { createNotifier, createWebPushSender } from './domain/notify.js';
import { startReminderLoop } from './domain/reminders.js';

const config = loadConfig();
const db = createDb(resolve(config.databasePath));
const push = createWebPushSender(db, config.vapid.subject, config.vapid);
const notify = createNotifier(db, push);
const app = createApp(
  { db, secret: config.secret, bonuses: config.bonuses, secureCookies: config.production, notify, push },
  { staticDir: resolve(config.staticDir) },
);

startReminderLoop(db, notify);

app.listen(config.port, () => {
  console.log(`DailyTracker escuchando en http://localhost:${config.port}`);
});
