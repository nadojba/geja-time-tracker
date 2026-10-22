import type { Preferences } from '@/domain/preferences';
import type { TimeSession } from '@/domain/types';
import type { AccountConfig, ExtensionState } from '@/services/storage/repository';

export type RuntimeMessage =
  | { type: 'GET_STATE' }
  | { type: 'OPEN_WINDOW' }
  | { type: 'SAVE_CONFIG'; url: string; apiKey: string }
  | { type: 'GET_ISSUES'; search?: string }
  | { type: 'GET_ACTIVITIES' }
  | { type: 'CONNECT'; url: string; apiKey: string; allowInsecureHttp?: boolean }
  | { type: 'START_SESSION'; issueId: number; projectId: number }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'STOP_SESSION' }
  | { type: 'SAVE_PREFERENCES'; preferences: Preferences }
  | { type: 'SUBMIT_SESSION'; sessionId: string; activityId: number; comments: string; spentOn: string; hours: number };

export type RuntimeResponse = { ok: true; state: ExtensionState; account?: AccountConfig; session?: TimeSession; issues?: unknown[]; activities?: unknown[] } | { ok: false; error: string };
