export type MatchType = "duo" | "group";
export type MatchStatus = "active" | "finished";
export type FocusDuration = 0.17 | 20 | 40 | 67;

export interface UserStats {
  totalMinutes: number;
  sessionsCount: number;
}

export interface UserInventory {
  hand: string[];
  collectionCounts: Record<string, number>;
}

export interface UserData {
  uid: string;
  displayName: string;
  photoURL: string;
  inventory: UserInventory;
  stats: UserStats;
}

export interface DashboardUserData extends UserData {
  friendCode: string;
  friends: string[];
  presence: string;
}

export interface FriendData {
  uid: string;
  displayName: string;
  photoURL: string;
  presence: string;
}

export interface MatchData {
  matchId: string;
  type: MatchType;
  createdAt: unknown;
  endsAt: unknown;
  status: MatchStatus;
  participants: string[];
  hp: Record<string, number>;
  alive: Record<string, boolean>;
  buffs: Record<string, unknown[]>;
  eventSeq: number;
  activityFeed: string[];
}

export interface FocusSessionData {
  sessionId: string;
  uid: string;
  matchId: string;
  durationMin: FocusDuration;
  startServerTime: unknown;
  endTime?: unknown;
  status: "running" | "completed" | "failed" | "cancelled";
  result: { rewardGranted: boolean; droppedCard: string | null };
}
