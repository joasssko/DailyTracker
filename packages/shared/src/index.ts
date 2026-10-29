import { z } from 'zod';

// ---------- Roles ----------
export const ROLES = ['dom', 'sub', 'switch'] as const;
export type Role = (typeof ROLES)[number];

// ---------- Tareas ----------
export const DIFFICULTIES = ['simple', 'complex'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const TASK_TYPES = ['once', 'recurring'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const COMPLETION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

// ---------- Sensaciones ----------
export const FEELINGS = ['orgullo', 'calma', 'placer', 'entrega', 'nervios', 'dificultad', 'cansancio'] as const;
export type Feeling = (typeof FEELINGS)[number];

export const FEELING_LABELS: Record<Feeling, { label: string; emoji: string }> = {
  orgullo: { label: 'Orgullo', emoji: '🌻' },
  calma: { label: 'Calma', emoji: '🍃' },
  placer: { label: 'Placer', emoji: '🍯' },
  entrega: { label: 'Entrega', emoji: '🕊️' },
  nervios: { label: 'Nervios', emoji: '🫧' },
  dificultad: { label: 'Me costó', emoji: '🪨' },
  cansancio: { label: 'Cansancio', emoji: '🌙' },
};

export const MOODS = ['radiante', 'bien', 'neutral', 'sensible', 'dificil'] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_LABELS: Record<Mood, { label: string; emoji: string }> = {
  radiante: { label: 'Radiante', emoji: '☀️' },
  bien: { label: 'Bien', emoji: '🌤️' },
  neutral: { label: 'Neutral', emoji: '☁️' },
  sensible: { label: 'Sensible', emoji: '🌧️' },
  dificil: { label: 'Difícil', emoji: '⛈️' },
};

// ---------- Rachas ----------
export const TIERS = ['bronze', 'silver', 'gold'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };

/** Días consecutivos necesarios para cada medalla, según dificultad. */
export const STREAK_THRESHOLDS: Record<Difficulty, Record<Tier, number>> = {
  simple: { bronze: 5, silver: 10, gold: 21 },
  complex: { bronze: 3, silver: 5, gold: 7 },
};

/** Medalla más alta alcanzada con `length` días seguidos (o null). */
export function tierForStreak(difficulty: Difficulty, length: number): Tier | null {
  const t = STREAK_THRESHOLDS[difficulty];
  if (length >= t.gold) return 'gold';
  if (length >= t.silver) return 'silver';
  if (length >= t.bronze) return 'bronze';
  return null;
}

/** Próxima medalla y cuántos días faltan; null si ya se tiene oro. */
export function nextTier(difficulty: Difficulty, length: number): { tier: Tier; remaining: number } | null {
  const t = STREAK_THRESHOLDS[difficulty];
  for (const tier of TIERS) {
    if (length < t[tier]) return { tier, remaining: t[tier] - length };
  }
  return null;
}

/** Suma `days` a una fecha YYYY-MM-DD (en calendario, sin zona horaria). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Fecha local YYYY-MM-DD de `at` en la zona horaria dada. */
export function localDate(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * Racha (días consecutivos) que contiene `date`, dado el conjunto de fechas cumplidas.
 * Devuelve el primer día y el largo de esa racha.
 */
export function runContaining(dates: Iterable<string>, date: string): { start: string; length: number } {
  const set = new Set(dates);
  if (!set.has(date)) return { start: date, length: 0 };
  let start = date;
  while (set.has(addDays(start, -1))) start = addDays(start, -1);
  let end = date;
  while (set.has(addDays(end, 1))) end = addDays(end, 1);
  let length = 1;
  for (let d = start; d !== end; d = addDays(d, 1)) length++;
  return { start, length };
}

/**
 * Racha vigente: termina hoy, o ayer si hoy aún no se cumple (sigue viva hasta medianoche).
 */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  const anchor = set.has(today) ? today : addDays(today, -1);
  return runContaining(set, anchor).length;
}

// ---------- Validación de entrada ----------
export const registerSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(60),
  role: z.enum(ROLES),
  timezone: z.string().max(64).optional(),
  remember: z.boolean().default(false),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  /** "Recuérdame" o app instalada: sesión larga y renovable. */
  remember: z.boolean().default(false),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  timezone: z.string().max(64).optional(),
});

export const taskCreateSchema = z.object({
  assignedTo: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  points: z.number().int().min(0).max(10000).default(10),
  difficulty: z.enum(DIFFICULTIES).default('simple'),
  type: z.enum(TASK_TYPES).default('once'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.omit({ assignedTo: true, type: true }).partial();

export const completeSchema = z.object({
  feeling: z.enum(FEELINGS).nullable().optional(),
  feelingNote: z.string().trim().max(2000).optional().default(''),
  feelingShared: z.boolean().default(true),
});

export const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
});

export const diarySchema = z.object({
  content: z.string().trim().min(1).max(10000),
  mood: z.enum(MOODS).nullable().optional(),
  visibility: z.enum(['private', 'shared']).default('private'),
  completionId: z.number().int().positive().nullable().optional(),
});

export const diaryUpdateSchema = diarySchema.pick({ content: true, visibility: true, mood: true }).partial();

export const rewardSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(''),
  cost: z.number().int().min(1).max(100000),
  icon: z.string().max(16).optional().default('🎁'),
  subId: z.number().int().positive().nullable().optional(),
});

export const rewardUpdateSchema = rewardSchema
  .omit({ subId: true })
  .partial()
  .extend({ status: z.enum(['proposed', 'active', 'archived']).optional() });

export const redemptionReviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'fulfill']),
});

export const joinSchema = z.object({ code: z.string().trim().min(4).max(32) });
