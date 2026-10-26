import type { SessionStatus, TimeSession } from './types';

const pendingStatuses: SessionStatus[] = ['pending', 'reconciliation_required'];

export function selectPendingSessions(
  sessions: TimeSession[],
  selectedIds: string[],
  accountId: string,
): TimeSession[] {
  const selected = new Set(selectedIds);
  return sessions.filter(
    (session) =>
      session.accountId === accountId &&
      pendingStatuses.includes(session.status) &&
      selected.has(session.id),
  );
}

export function groupPendingSessions(sessions: TimeSession[]): TimeSession[][] {
  const groups = new Map<string, TimeSession[]>();
  for (const session of sessions) {
    if (!pendingStatuses.includes(session.status)) continue;
    const key = `${session.issueId}:${session.spentOn}:${session.activityId ?? 'none'}`;
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  }
  return [...groups.values()];
}
