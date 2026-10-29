import type { StreakBonuses } from './domain/tasks.js';

const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export function loadConfig() {
  const production = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (production) throw new Error('SESSION_SECRET es obligatorio (mínimo 16 caracteres)');
  }
  const bonuses: StreakBonuses = {
    bronze: num(process.env.STREAK_BONUS_BRONZE, 20),
    silver: num(process.env.STREAK_BONUS_SILVER, 50),
    gold: num(process.env.STREAK_BONUS_GOLD, 100),
  };
  return {
    production,
    port: num(process.env.PORT, 3000),
    secret: secret ?? 'dev-only-secret-no-usar-en-produccion',
    databasePath: process.env.DATABASE_PATH ?? './data/dailytracker.db',
    staticDir: process.env.STATIC_DIR ?? '../web/dist',
    bonuses,
  };
}
