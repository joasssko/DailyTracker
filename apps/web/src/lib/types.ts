import type { CompletionStatus, Difficulty, Role, TaskType, Tier } from '@shared';

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  timezone: string;
  createdAt: string;
}

export interface Me {
  user: User;
  balance: number;
  dom: User | null;
}

export interface Completion {
  id: number;
  taskId: number;
  userId: number;
  localDate: string;
  status: CompletionStatus;
  feeling: string | null;
  feelingNote: string;
  feelingShared: boolean;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface TaskView {
  id: number;
  createdBy: number;
  assignedTo: number;
  title: string;
  description: string;
  points: number;
  difficulty: Difficulty;
  type: TaskType;
  dueDate: string | null;
  requiresApproval: boolean;
  archivedAt: string | null;
  createdAt: string;
  today: string;
  ended: boolean;
  completion: Completion | null;
  recentDates: { date: string; status: CompletionStatus }[];
  streak: null | {
    current: number;
    best: number;
    next: { tier: Tier; remaining: number } | null;
    thresholds: Record<Tier, number>;
    highestTier: Tier | null;
    badges: Record<Tier, number>;
  };
}

export interface DiaryEntry {
  id: number;
  userId: number;
  content: string;
  mood: string | null;
  visibility: 'private' | 'shared';
  completionId: number | null;
  createdAt: string;
}

export interface Reward {
  id: number;
  ownerId: number;
  subId: number | null;
  subName?: string | null;
  proposedBy: number;
  title: string;
  description: string;
  cost: number;
  icon: string;
  status: 'proposed' | 'active' | 'archived';
}

export interface Redemption {
  id: number;
  rewardId: number;
  userId: number;
  cost: number;
  status: 'requested' | 'approved' | 'fulfilled' | 'rejected';
  createdAt: string;
  title: string;
  icon: string;
  userName: string;
}

export interface SubSummary {
  relationshipId: number;
  user: User;
  balance: number;
  pendingReviews: number;
  activeTasks: number;
  doneToday: number;
  recurringCount: number;
  bestStreak: number;
  lastShared: { mood: string | null; createdAt: string } | null;
}

export interface Invite {
  id: number;
  inviteCode: string;
  createdAt: string;
}

export interface LedgerRow {
  id: number;
  amount: number;
  kind: string;
  reason: string;
  createdAt: string;
}

export interface Badge {
  id: number;
  taskId: number;
  tier: Tier;
  streakLen: number;
  taskTitle: string;
  createdAt: string;
}

export interface FeelingRow extends Completion {
  taskTitle: string;
}

export interface ReviewInbox {
  completions: (Completion & {
    userName: string;
    task: { id: number; title: string; points: number; type: TaskType; difficulty: Difficulty };
  })[];
  redemptions: Redemption[];
  proposals: (Reward & { userName: string })[];
}
