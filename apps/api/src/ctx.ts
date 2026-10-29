import type { DB } from './db/index.js';
import type { StreakBonuses } from './domain/tasks.js';

export interface AppCtx {
  db: DB;
  secret: string;
  bonuses: StreakBonuses;
  secureCookies: boolean;
}
