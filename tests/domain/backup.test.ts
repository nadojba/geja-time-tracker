import { describe, expect, it } from 'vitest';
import { createLocalBackup, parseLocalBackup } from '@/domain/backup';
import { emptyState } from '@/services/storage/repository';

describe('backup local', () => {
  it('exporta apenas dados da conta ativa e nunca credenciais', () => {
    const state = emptyState();
    state.account = {
      accountId: 'account-1',
      redmineUrl: 'https://redmine.example',
      apiKey: 'secret',
      user: { id: 7, name: 'Usuário', login: 'user' },
      connectedAt: '2026-10-23T10:00:00.000Z',
    };
    state.sessions = [{
      id: 's1', accountId: 'account-1', issueId: 1, projectId: 2, userId: 7,
      startedAt: '2026-10-23T10:00:00.000Z', endedAt: '2026-10-23T11:00:00.000Z',
      durationSeconds: 3600, status: 'pending', description: '', activityId: null,
      spentOn: '2026-10-23', timeEntryId: null, submittedAt: null, segments: [],
      createdAt: '2026-10-23T10:00:00.000Z', updatedAt: '2026-10-23T11:00:00.000Z',
    }];
    const backup = createLocalBackup(state, '2026-10-23T12:00:00.000Z');
    expect(backup.accountId).toBe('account-1');
    expect(JSON.stringify(backup)).not.toContain('secret');
    expect(parseLocalBackup(backup, 'account-1').sessions).toHaveLength(1);
    expect(() => parseLocalBackup(backup, 'account-2')).toThrow('outra conta');
  });
});
