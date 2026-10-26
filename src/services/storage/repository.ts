import type { Preferences } from '@/domain/preferences';
import { defaultPreferences } from '@/domain/preferences';
import type { TimeSession } from '@/domain/types';
import { createPersonalBoard, defaultBoard, normalizeBoard, type BoardState, type PersonalBoard } from '@/domain/board';

export interface AccountConfig {
  accountId: string;
  redmineUrl: string;
  apiKey: string;
  user: { id: number; name: string; login: string };
  connectedAt: string;
}

export interface ExtensionState {
  schemaVersion: 1;
  account: AccountConfig | null;
  savedConfig: { redmineUrl: string; apiKey: string } | null;
  sessions: TimeSession[];
  board: BoardState;
  boards: PersonalBoard[];
  activeBoardId: string | null;
  preferences: Preferences;
}

export const emptyState = (): ExtensionState => ({ schemaVersion: 1, account: null, savedConfig: null, sessions: [], board: defaultBoard(), boards: [], activeBoardId: null, preferences: defaultPreferences });

export interface KeyValueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export const chromeLocalStorage: KeyValueStorage = {
  async get(key) { return (await chrome.storage.local.get(key))[key]; },
  async set(key, value) { await chrome.storage.local.set({ [key]: value }); },
};

export class StateRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: KeyValueStorage = chromeLocalStorage) {}

  async load(): Promise<ExtensionState> {
    const value = await this.storage.get('redmine-time-tracker-state');
    if (!value || typeof value !== 'object') return emptyState();
    const input = value as Partial<ExtensionState>;
    const normalizedBoard = normalizeBoard(input.board);
    const base = { ...emptyState(), ...input, board: normalizedBoard, preferences: { ...defaultPreferences, ...(input.preferences ?? {}) } };
    const accountId = base.account?.accountId;
    const boards = Array.isArray(input.boards) && input.boards.length
      ? input.boards as PersonalBoard[]
      : accountId
        ? [createPersonalBoard(accountId, 'Meu board', base.board, false)]
        : [];
    const activeBoardId = input.activeBoardId ?? boards[0]?.id ?? null;
    const selectedBoard = boards.find((item) => item.id === activeBoardId);
    const board = normalizedBoard.cards.length || !selectedBoard?.cards.length
      ? normalizedBoard
      : normalizeBoard(selectedBoard);
    return { ...base, board, boards, activeBoardId };
  }

  async update(mutator: (state: ExtensionState) => ExtensionState | Promise<ExtensionState>): Promise<ExtensionState> {
    let result!: ExtensionState;
    this.queue = this.queue.catch(() => undefined).then(async () => {
      const current = await this.load();
      result = await mutator(current);
      await this.storage.set('redmine-time-tracker-state', result);
    });
    await this.queue;
    return result;
  }
}

export const accountScopedSessions = (state: ExtensionState, accountId: string) => state.sessions.filter((session) => session.accountId === accountId);
