import type { DB } from './db/index.js';
import type { Notifier, PushSender } from './domain/notify.js';
import type { StreakBonuses } from './domain/tasks.js';

export interface AppCtx {
  db: DB;
  secret: string;
  bonuses: StreakBonuses;
  secureCookies: boolean;
  /** Guarda el aviso en el buzón y envía push si corresponde. */
  notify: Notifier;
  /** null si el push no está disponible (por ejemplo, en tests). */
  push: PushSender | null;
}
