import type { StartSessionInput, TimeSession, TimerState } from './types';

const isoDate = (value: string) => value.slice(0, 10);
const id = () => crypto.randomUUID();

export const createTimerState = (): TimerState => ({ activeSession: null, sessions: [] });

const ensureNoActiveSession = (state: TimerState) => {
  if (state.activeSession?.status === 'running' || state.activeSession?.status === 'paused') {
    throw new Error('Já existe uma sessão ativa. Pare ou pause a sessão antes de iniciar outra.');
  }
};

export const startSession = (state: TimerState, input: StartSessionInput): TimerState => {
  ensureNoActiveSession(state);
  const session: TimeSession = {
    id: id(),
    accountId: input.accountId,
    issueId: input.issueId,
    projectId: input.projectId,
    userId: input.userId,
    startedAt: input.now,
    endedAt: null,
    durationSeconds: 0,
    status: 'running',
    description: input.description ?? '',
    activityId: null,
    spentOn: input.spentOn ?? isoDate(input.now),
    timeEntryId: null,
    submittedAt: null,
    segments: [{ startedAt: input.now, endedAt: null, durationSeconds: 0 }],
    createdAt: input.now,
    updatedAt: input.now,
  };
  return { ...state, activeSession: session, sessions: [...state.sessions, session] };
};

export const getSessionDuration = (session: TimeSession, now: string): number => {
  const last = session.segments.at(-1);
  if (!last) return session.durationSeconds;
  const live = last.endedAt ? 0 : Math.max(0, (Date.parse(now) - Date.parse(last.startedAt)) / 1000);
  return Math.floor(session.segments.reduce((total, segment) => total + segment.durationSeconds, 0) + live);
};

export const getDisplayedDuration = (session: Pick<TimeSession, 'durationSeconds' | 'status' | 'segments'>, now: string): number => {
  if (session.status !== 'running') return session.durationSeconds;
  const currentSegment = session.segments.at(-1);
  if (!currentSegment) return session.durationSeconds;
  return session.durationSeconds + Math.max(0, Math.floor((Date.parse(now) - Date.parse(currentSegment.startedAt)) / 1000));
};

export const getIssueDisplayedDuration = (session: Pick<TimeSession, 'issueId' | 'durationSeconds' | 'status' | 'segments'>, issueId: number, now: string): number => {
  if (session.issueId !== issueId) return 0;
  return getDisplayedDuration(session, now);
};

const updateSession = (state: TimerState, session: TimeSession): TimerState => ({
  activeSession: session,
  sessions: state.sessions.map((item) => (item.id === session.id ? session : item)),
});

export const pauseSession = (state: TimerState, now: string): TimerState => {
  const session = state.activeSession;
  if (!session || session.status !== 'running') throw new Error('Não há sessão em execução para pausar.');
  const last = session.segments.at(-1)!;
  const durationSeconds = Math.floor((Date.parse(now) - Date.parse(last.startedAt)) / 1000);
  const updated: TimeSession = {
    ...session,
    status: 'paused',
    durationSeconds: session.durationSeconds + Math.max(0, durationSeconds),
    updatedAt: now,
    segments: session.segments.map((segment, index) => index === session.segments.length - 1 ? { ...segment, endedAt: now, durationSeconds: Math.max(0, durationSeconds) } : segment),
  };
  return updateSession(state, updated);
};

export const resumeSession = (state: TimerState, now: string): TimerState => {
  const session = state.activeSession;
  if (!session || session.status !== 'paused') throw new Error('A sessão atual não está pausada.');
  const updated: TimeSession = { ...session, status: 'running', updatedAt: now, segments: [...session.segments, { startedAt: now, endedAt: null, durationSeconds: 0 }] };
  return updateSession(state, updated);
};

export const stopSession = (state: TimerState, now: string): TimerState => {
  const session = state.activeSession;
  if (!session || (session.status !== 'running' && session.status !== 'paused')) throw new Error('Não há sessão para parar.');
  const last = session.segments.at(-1)!;
  const liveDuration = session.status === 'running' ? Math.floor((Date.parse(now) - Date.parse(last.startedAt)) / 1000) : 0;
  const segments = session.status === 'running'
    ? session.segments.map((segment, index) => index === session.segments.length - 1 ? { ...segment, endedAt: now, durationSeconds: Math.max(0, liveDuration) } : segment)
    : session.segments;
  const updated: TimeSession = { ...session, status: 'pending', endedAt: now, durationSeconds: session.durationSeconds + Math.max(0, liveDuration), updatedAt: now, segments };
  return { activeSession: null, sessions: state.sessions.map((item) => item.id === session.id ? updated : item) };
};

export const roundDurationSuggestion = (seconds: number, intervalMinutes: number, mode: 'down' | 'nearest' | 'up'): number => {
  const interval = Math.max(1, intervalMinutes) * 60;
  const quotient = seconds / interval;
  const rounded = mode === 'down' ? Math.floor(quotient) : mode === 'up' ? Math.ceil(quotient) : Math.round(quotient);
  return rounded * interval;
};
