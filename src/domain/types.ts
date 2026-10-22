export type SessionStatus =
  | 'running'
  | 'paused'
  | 'pending'
  | 'submitting'
  | 'submitted'
  | 'reconciliation_required';

export interface ExecutionSegment {
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
}

export interface TimeSession {
  id: string;
  accountId: string;
  issueId: number;
  projectId: number;
  userId: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  status: SessionStatus;
  description: string;
  activityId: number | null;
  spentOn: string;
  timeEntryId: number | null;
  submittedAt: string | null;
  segments: ExecutionSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface TimerState {
  activeSession: TimeSession | null;
  sessions: TimeSession[];
}

export interface StartSessionInput {
  accountId: string;
  issueId: number;
  projectId: number;
  userId: number;
  now: string;
  description?: string;
  spentOn?: string;
}
