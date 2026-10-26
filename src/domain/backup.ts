import type { Preferences } from '@/domain/preferences';
import type { TimeSession } from '@/domain/types';
import type { ExtensionState } from '@/services/storage/repository';

export interface LocalBackup {
  version: 1;
  exportedAt: string;
  accountId: string;
  sessions: TimeSession[];
  preferences: Preferences;
}

export function createLocalBackup(
  state: ExtensionState,
  exportedAt = new Date().toISOString(),
): LocalBackup {
  if (!state.account) throw new Error('Conecte uma conta antes de exportar o backup.');
  return {
    version: 1,
    exportedAt,
    accountId: state.account.accountId,
    sessions: state.sessions.filter(
      (session) => session.accountId === state.account?.accountId,
    ),
    preferences: state.preferences,
  };
}

export function parseLocalBackup(value: unknown, accountId: string): LocalBackup {
  if (!value || typeof value !== 'object')
    throw new Error('Arquivo de backup inválido.');
  const input = value as Partial<LocalBackup>;
  if (input.version !== 1 || input.accountId !== accountId || !Array.isArray(input.sessions))
    throw new Error('Este backup pertence a outra conta Redmine ou está em formato incompatível.');
  if (!input.preferences || typeof input.preferences !== 'object')
    throw new Error('O backup não contém preferências válidas.');
  if (input.sessions.some((session) => session.accountId !== accountId))
    throw new Error('O backup contém sessões de outra conta.');
  return {
    version: 1,
    exportedAt: String(input.exportedAt ?? ''),
    accountId,
    sessions: input.sessions,
    preferences: input.preferences as Preferences,
  };
}
