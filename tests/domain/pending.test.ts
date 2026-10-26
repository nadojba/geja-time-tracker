import { describe, expect, it } from 'vitest';
import { groupPendingSessions, selectPendingSessions } from '@/domain/pending';
import type { TimeSession } from '@/domain/types';

const session = (overrides: Partial<TimeSession>): TimeSession => ({
  id: 'session-default',
  accountId: 'account-a',
  issueId: 101758,
  projectId: 7,
  userId: 3,
  startedAt: '2026-10-23T08:00:00.000Z',
  endedAt: '2026-10-23T08:30:00.000Z',
  durationSeconds: 1800,
  status: 'pending',
  description: '',
  activityId: 9,
  spentOn: '2026-10-23',
  timeEntryId: null,
  submittedAt: null,
  segments: [],
  createdAt: '2026-10-23T08:00:00.000Z',
  updatedAt: '2026-10-23T08:30:00.000Z',
  ...overrides,
});

describe('sessões pendentes', () => {
  it('seleciona somente sessões pendentes da conta atual', () => {
    const sessions = [
      session({ id: 'a' }),
      session({ id: 'b', status: 'submitted' }),
      session({ id: 'c', accountId: 'account-b' }),
    ];
    expect(
      selectPendingSessions(sessions, ['a', 'b', 'c'], 'account-a').map(
        (item) => item.id,
      ),
    ).toEqual(['a']);
  });

  it('agrupa somente sessões compatíveis em chamado, data e atividade', () => {
    const sessions = [
      session({ id: 'a' }),
      session({ id: 'b' }),
      session({ id: 'c', issueId: 101912 }),
      session({ id: 'd', activityId: 10 }),
      session({ id: 'e', spentOn: '2026-10-24' }),
    ];
    expect(
      groupPendingSessions(sessions).map((group) =>
        group.map((item) => item.id),
      ),
    ).toEqual([['a', 'b'], ['c'], ['d'], ['e']]);
  });
});
