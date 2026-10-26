import type { Preferences } from '@/domain/preferences';
import type { TimeSession } from '@/domain/types';
import type { LocalBackup } from '@/domain/backup';
import type { BoardState, PersonalBoard } from '@/domain/board';
import type {
  AccountConfig,
  ExtensionState,
} from '@/services/storage/repository';

export type RuntimeMessage =
  | { type: 'GET_STATE' }
  | { type: 'SAVE_BOARD'; board: BoardState }
  | { type: 'SAVE_BOARDS'; boards: PersonalBoard[]; activeBoardId: string }
  | { type: 'GET_DIAGNOSTICS' }
  | { type: 'IMPORT_LOCAL_BACKUP'; backup: LocalBackup }
  | { type: 'OPEN_WINDOW'; tab?: 'timer' | 'hours' }
  | { type: 'OPEN_TIMER_WINDOW' }
  | { type: 'OPEN_BOARD_WINDOW' }
  | { type: 'OPEN_SIDE_PANEL' }
  | { type: 'OPEN_ACTIVE_ISSUE'; issueId: number }
  | { type: 'LAUNCH_CURRENT_ISSUE'; issueId: number }
  | { type: 'SAVE_CONFIG'; url: string; apiKey: string }
  | { type: 'GET_ISSUES'; scope?: 'assigned' | 'all' }
  | { type: 'GET_ISSUE'; issueId: number }
  | { type: 'GET_PROJECTS' }
  | {
      type: 'CREATE_ISSUE';
      projectId: number;
      subject: string;
      description: string;
      trackerId?: number;
      statusId?: number;
      priorityId?: number;
    }
  | { type: 'GET_TIME_ENTRIES'; from?: string; to?: string; issueId?: number }
  | { type: 'GET_ACTIVITIES' }
  | {
      type: 'CONNECT';
      url: string;
      apiKey: string;
      allowInsecureHttp?: boolean;
    }
  | {
      type: 'START_SESSION';
      issueId: number;
      projectId: number;
      ownerTabId?: number;
    }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'STOP_SESSION' }
  | {
      type: 'UPDATE_ACTIVE_SESSION_DURATION';
      durationSeconds: number;
    }
  | {
      type: 'UPDATE_SESSION_DRAFT';
      sessionId: string;
      comments: string;
      activityId: number | null;
      spentOn: string;
      draftHours: number | null;
    }
  | { type: 'DELETE_SESSION'; sessionId: string }
  | { type: 'SUBMIT_SESSIONS'; sessionIds: string[] }
  | { type: 'RECONCILE_SESSION'; sessionId: string }
  | { type: 'SAVE_PREFERENCES'; preferences: Preferences }
  | {
      type: 'SUBMIT_SESSION';
      sessionId: string;
      activityId: number;
      comments: string;
      spentOn: string;
      hours: number;
    };

export type RuntimeResponse =
  | {
      ok: true;
      state: ExtensionState;
      account?: AccountConfig;
      session?: TimeSession;
      issues?: unknown[];
      issue?: unknown;
      projects?: unknown[];
      createdIssue?: unknown;
      timeEntries?: unknown[];
      activities?: unknown[];
      diagnostics?: {
        accountConnected: boolean;
        accountId?: string;
        redmineUrl?: string;
        permissionGranted: boolean;
        schemaVersion: number;
        sessionCount: number;
        pendingCount: number;
        activeIssueId?: number;
      };
    }
  | { ok: false; error: string };
