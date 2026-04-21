export type SessionModerationDecision = 'reviewed' | 'flagged';
export type SessionModerationQueueFilter = 'unreviewed' | SessionModerationDecision;

export interface SessionQueuePlayer {
  id: string;
  username: string;
  email: string | null;
}

export interface SessionQueueModeration {
  id: string;
  decision: SessionModerationDecision;
  reason: string;
  createdAt: string;
  reviewer: {
    id: string | null;
    username: string;
  };
}

export interface SessionQueueItem {
  id: string;
  mode: string;
  letter: string;
  score: number;
  correctCount: number;
  timeUsed: number;
  xpEarned: number;
  createdAt: string;
  player: SessionQueuePlayer;
  suspicionIndicators: string[];
  latestModeration: SessionQueueModeration | null;
}

export interface PaginatedModerationSessions {
  page: number;
  limit: number;
  total: number;
  data: SessionQueueItem[];
}

export interface ModerationMetrics {
  queueUnreviewedTotal: number;
  queueFlaggedTotal: number;
  reviewedLast24h: number;
  staleUnreviewed24h: number;
  medianFirstReviewMinutes: number | null;
  computedAt: string;
}

export interface ListModerationSessionsQuery {
  search?: string;
  mode?: 'practice' | 'ranked' | 'daily' | 'relax' | 'hardcore';
  decision?: SessionModerationQueueFilter;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
}

export interface SessionDetailAnswer {
  id: number;
  categoryId: number;
  categoryName: string | null;
  answer: string;
  valid: boolean;
  confidence: number;
}

export interface SessionModerationHistoryItem {
  id: string;
  decision: SessionModerationDecision;
  reason: string;
  createdAt: string;
  reviewer: {
    id: string | null;
    username: string;
  };
}

export interface SessionModerationDetail {
  id: string;
  mode: string;
  letter: string;
  score: number;
  correctCount: number;
  multiplier: number;
  timeUsed: number;
  xpEarned: number;
  createdAt: string;
  player: SessionQueuePlayer;
  suspicionIndicators: string[];
  answers: SessionDetailAnswer[];
  moderationHistory: SessionModerationHistoryItem[];
}

export interface ReviewSessionPayload {
  decision: SessionModerationDecision;
  reason: string;
}
