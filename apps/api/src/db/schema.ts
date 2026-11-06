import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['dom', 'sub', 'switch'] }).notNull(),
  timezone: text('timezone').notNull().default('America/Santiago'),
  createdAt: createdAt(),
});

/** Vínculo Dom → sum. Un Dom puede tener varios sums; un sum, un Dom activo. */
export const relationships = sqliteTable(
  'relationships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    domId: integer('dom_id').notNull().references(() => users.id),
    subId: integer('sub_id').references(() => users.id),
    status: text('status', { enum: ['pending', 'active', 'ended'] }).notNull().default('pending'),
    inviteCode: text('invite_code').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index('rel_dom_idx').on(t.domId, t.status), index('rel_sub_idx').on(t.subId, t.status)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    createdBy: integer('created_by').notNull().references(() => users.id),
    assignedTo: integer('assigned_to').notNull().references(() => users.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    points: integer('points').notNull().default(10),
    difficulty: text('difficulty', { enum: ['simple', 'complex'] }).notNull().default('simple'),
    type: text('type', { enum: ['once', 'recurring'] }).notNull().default('once'),
    recurrence: text('recurrence').notNull().default('daily'),
    dueDate: text('due_date'),
    requiresApproval: integer('requires_approval', { mode: 'boolean' }).notNull().default(true),
    currentStreak: integer('current_streak').notNull().default(0),
    bestStreak: integer('best_streak').notNull().default(0),
    archivedAt: text('archived_at'),
    createdAt: createdAt(),
  },
  (t) => [index('tasks_assigned_idx').on(t.assignedTo, t.archivedAt), index('tasks_creator_idx').on(t.createdBy)],
);

export const taskCompletions = sqliteTable(
  'task_completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: integer('task_id').notNull().references(() => tasks.id),
    userId: integer('user_id').notNull().references(() => users.id),
    localDate: text('local_date').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    feeling: text('feeling'),
    feelingNote: text('feeling_note').notNull().default(''),
    feelingShared: integer('feeling_shared', { mode: 'boolean' }).notNull().default(true),
    reviewNote: text('review_note'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: text('reviewed_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('completion_task_date_uq').on(t.taskId, t.localDate),
    index('completion_status_idx').on(t.status),
  ],
);

export const streakBadges = sqliteTable(
  'streak_badges',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: integer('task_id').notNull().references(() => tasks.id),
    userId: integer('user_id').notNull().references(() => users.id),
    tier: text('tier', { enum: ['bronze', 'silver', 'gold'] }).notNull(),
    runStart: text('run_start').notNull(),
    streakLen: integer('streak_len').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('badge_run_uq').on(t.taskId, t.tier, t.runStart), index('badge_user_idx').on(t.userId)],
);

export const diaryEntries = sqliteTable(
  'diary_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    content: text('content').notNull(),
    mood: text('mood'),
    visibility: text('visibility', { enum: ['private', 'shared'] }).notNull().default('private'),
    completionId: integer('completion_id').references(() => taskCompletions.id),
    createdAt: createdAt(),
  },
  (t) => [index('diary_user_idx').on(t.userId, t.createdAt)],
);

export const rewards = sqliteTable(
  'rewards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Dom (o switch) que administra la recompensa. */
    ownerId: integer('owner_id').notNull().references(() => users.id),
    /** Si está definido, la recompensa es solo para ese sum. */
    subId: integer('sub_id').references(() => users.id),
    proposedBy: integer('proposed_by').notNull().references(() => users.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    cost: integer('cost').notNull(),
    icon: text('icon').notNull().default('🎁'),
    status: text('status', { enum: ['proposed', 'active', 'archived'] }).notNull().default('active'),
    createdAt: createdAt(),
  },
  (t) => [index('rewards_owner_idx').on(t.ownerId, t.status)],
);

export const redemptions = sqliteTable(
  'redemptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    rewardId: integer('reward_id').notNull().references(() => rewards.id),
    userId: integer('user_id').notNull().references(() => users.id),
    cost: integer('cost').notNull(),
    status: text('status', { enum: ['requested', 'approved', 'fulfilled', 'rejected'] }).notNull().default('requested'),
    createdAt: createdAt(),
    updatedAt: text('updated_at'),
  },
  (t) => [index('redemptions_user_idx').on(t.userId, t.status)],
);

/** Libro de puntos: toda variación de saldo queda registrada aquí. */
export const pointLedger = sqliteTable(
  'point_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    amount: integer('amount').notNull(),
    kind: text('kind', { enum: ['task', 'streak_bonus', 'redeem', 'refund', 'manual'] }).notNull(),
    refId: integer('ref_id'),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('ledger_user_idx').on(t.userId, t.createdAt)],
);

/** Preferencias de notificación por persona (si no hay fila, aplican los valores por defecto). */
export const notificationPrefs = sqliteTable('notification_prefs', {
  userId: integer('user_id').primaryKey().references(() => users.id),
  remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(true),
  /** Hora local HH:MM del recordatorio diario. */
  reminderTime: text('reminder_time').notNull().default('09:00'),
  /** Modo discreto: el aviso en pantalla bloqueada no muestra nombres ni títulos. */
  discreet: integer('discreet', { mode: 'boolean' }).notNull().default(true),
  notifyAssigned: integer('notify_assigned', { mode: 'boolean' }).notNull().default(true),
  notifyCompleted: integer('notify_completed', { mode: 'boolean' }).notNull().default(true),
  notifyReviewed: integer('notify_reviewed', { mode: 'boolean' }).notNull().default(true),
  notifyRewards: integer('notify_rewards', { mode: 'boolean' }).notNull().default(true),
  /** Último día local en que se envió el recordatorio (evita repetirlo). */
  lastReminderDate: text('last_reminder_date'),
});

/** Suscripciones Web Push: una por navegador o dispositivo. */
export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [index('push_user_idx').on(t.userId)],
);

/** Buzón de alertas dentro de la app. */
export const notifications = sqliteTable(
  'notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    kind: text('kind', {
      enum: ['reminder', 'task_assigned', 'task_completed', 'task_reviewed', 'reward_requested', 'reward_proposed', 'reward_reviewed', 'test'],
    }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    url: text('url').notNull().default('/'),
    readAt: text('read_at'),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

/** Ajustes internos de la app (por ejemplo, las claves VAPID generadas). */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
