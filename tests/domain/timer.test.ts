import { describe, expect, it } from 'vitest';
import { createTimerState, startSession, stopSession, pauseSession, resumeSession, getSessionDuration, getDisplayedDuration, getIssueDisplayedDuration } from '@/domain/timer';

describe('sessões do timer', () => {
  it('iniciar depois de parar cria outra sessão zerada e preserva a primeira', () => {
    const first = startSession(createTimerState(), { issueId: 101758, projectId: 7, userId: 3, accountId: 'account-a', now: '2026-10-22T08:00:00.000Z' });
    const stopped = stopSession(first, '2026-10-22T08:45:00.000Z');
    const second = startSession(stopped, { issueId: 101758, projectId: 7, userId: 3, accountId: 'account-a', now: '2026-10-22T09:15:00.000Z' });

    expect(second.sessions).toHaveLength(2);
    expect(second.sessions[0].durationSeconds).toBe(2700);
    expect(second.sessions[0].status).toBe('pending');
    expect(second.activeSession?.id).not.toBe(second.sessions[0].id);
    expect(getSessionDuration(second.activeSession!, '2026-10-22T09:15:00.000Z')).toBe(0);
  });

  it('pausar e retomar continuam a mesma sessão sem criar uma nova', () => {
    const running = startSession(createTimerState(), { issueId: 1, projectId: 2, userId: 3, accountId: 'a', now: '2026-10-22T08:00:00.000Z' });
    const paused = pauseSession(running, '2026-10-22T08:20:00.000Z');
    const resumed = resumeSession(paused, '2026-10-22T09:00:00.000Z');
    const ended = stopSession(resumed, '2026-10-22T09:30:00.000Z');

    expect(ended.sessions).toHaveLength(1);
    expect(ended.sessions[0].durationSeconds).toBe(3000);
    expect(ended.sessions[0].segments).toHaveLength(2);
  });

  it('arredondamento é apenas sugestão e não altera a duração real', () => {
    const session = startSession(createTimerState(), { issueId: 1, projectId: 2, userId: 3, accountId: 'a', now: '2026-10-22T08:00:00.000Z' });
    const ended = stopSession(session, '2026-10-22T08:22:00.000Z');
    expect(ended.sessions[0].durationSeconds).toBe(1320);
  });

  it('exibe o tempo corrente de uma sessão em execução sem alterar o valor persistido', () => {
    const running = startSession(createTimerState(), { issueId: 1, projectId: 2, userId: 3, accountId: 'a', now: '2026-10-22T08:00:00.000Z' });
    expect(getDisplayedDuration(running.activeSession!, '2026-10-22T08:01:05.000Z')).toBe(65);
    expect(running.activeSession?.durationSeconds).toBe(0);
  });

  it('não exibe a duração da sessão ativa em outro chamado', () => {
    const running = startSession(createTimerState(), { issueId: 101758, projectId: 7, userId: 3, accountId: 'a', now: '2026-10-22T08:00:00.000Z' });
    expect(getIssueDisplayedDuration(running.activeSession!, 101758, '2026-10-22T08:15:32.000Z')).toBe(932);
    expect(getIssueDisplayedDuration(running.activeSession!, 202020, '2026-10-22T08:15:32.000Z')).toBe(0);
  });
});
