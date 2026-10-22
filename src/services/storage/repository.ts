import type { Preferences } from '@/domain/preferences';
import { defaultPreferences } from '@/domain/preferences';
import type { TimeSession } from '@/domain/types';

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
  preferences: Preferences;
}

export const emptyState = (): ExtensionState => ({ schemaVersion: 1, account: null, savedConfig: null, sessions: [], preferences: defaultPreferences });

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
    return { ...emptyState(), ...input, preferences: { ...defaultPreferences, ...(input.preferences ?? {}) } };
  }

  async update(mutator: (state: ExtensionState) => ExtensionState | Promise<ExtensionState>): Promise<ExtensionState> {
    let result!: ExtensionState;
    this.queue = this.queue.then(async () => {
      const current = await this.load();
      result = await mutator(current);
      await this.storage.set('redmine-time-tracker-state', result);
    });
    await this.queue;
    return result;
  }
}

export const accountScopedSessions = (state: ExtensionState, accountId: string) => state.sessions.filter((session) => session.accountId === accountId);
