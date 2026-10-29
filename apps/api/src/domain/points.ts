import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { pointLedger } from '../db/schema.js';

type Kind = (typeof pointLedger.$inferInsert)['kind'];

export function balanceOf(db: DB, userId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${pointLedger.amount}), 0)` })
    .from(pointLedger)
    .where(eq(pointLedger.userId, userId))
    .get();
  return row?.total ?? 0;
}

export function addPoints(db: DB, userId: number, amount: number, kind: Kind, reason: string, refId?: number) {
  if (amount === 0) return;
  db.insert(pointLedger).values({ userId, amount, kind, reason, refId }).run();
}
