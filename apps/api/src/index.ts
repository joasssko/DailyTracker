import { resolve } from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/index.js';

const config = loadConfig();
const db = createDb(resolve(config.databasePath));
const app = createApp(
  { db, secret: config.secret, bonuses: config.bonuses, secureCookies: config.production },
  { staticDir: resolve(config.staticDir) },
);

app.listen(config.port, () => {
  console.log(`DailyTracker escuchando en http://localhost:${config.port}`);
});
