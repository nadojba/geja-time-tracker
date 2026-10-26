/// <reference path="../.wxt/types/imports-module.d.ts" />
import { RedmineClient, buildAccountId } from '@/services/redmine/client';
import { StateRepository } from '@/services/storage/repository';
import {
  createTimerState,
  pauseSession,
  resumeSession,
  startSession,
  stopSession,
  getDisplayedDuration,
  setActiveSessionDuration,
} from '@/domain/timer';
import type {
  RuntimeMessage,
  RuntimeResponse,
} from '@/services/messaging/protocol';
import type { TimeSession } from '@/domain/types';
import { defineBackground } from '#imports';
import {
  assertRedmineHostPermission,
  isInsecureRedmineUrl,
  normalizeRedmineUrl,
  redmineOriginPattern,
  redmineIssueUrl,
  redmineIssueIdFromUrl,
} from '@/services/permissions/host';
import { getSuggestedEntryHours } from '@/domain/preferences';
import { resolveTimerKeyboardAction } from '@/domain/keyboard-commands';
import { parseLocalBackup } from '@/domain/backup';
import { normalizeBoard } from '@/domain/board';
import { setLanguage, translate as t } from '@/i18n';

const repository = new StateRepository();
const CONTENT_SCRIPT_ID = 'geja-redmine-issue-timer';
const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';
let timerWindowId: number | undefined;
let longRunningNoticeSessionId: string | undefined;

const responseError = (error: unknown): RuntimeResponse => ({
  ok: false,
  error: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
});
const activeState = (sessions: TimeSession[]) => ({
  activeSession:
    sessions.find(
      (session) => session.status === 'running' || session.status === 'paused',
    ) ?? null,
  sessions,
});
const publicState = (state: Awaited<ReturnType<StateRepository['load']>>) => ({
  ...state,
  account: state.account ? { ...state.account, apiKey: '' } : null,
  savedConfig: state.savedConfig ? { ...state.savedConfig, apiKey: '' } : null,
});

async function updateActionIndicator(
  state: Awaited<ReturnType<StateRepository['load']>>,
): Promise<void> {
  setLanguage(state.preferences.language);
  const active = state.sessions.find(
    (session) => session.status === 'running' || session.status === 'paused',
  );
  if (!active) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Geja Time Tracker - Redmine' });
    return;
  }
  const seconds = getDisplayedDuration(active, new Date().toISOString());
  const minutes = Math.floor(seconds / 60);
  const badge = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
  await chrome.action.setBadgeText({ text: badge });
  await chrome.action.setBadgeBackgroundColor({
    color: active.status === 'paused' ? '#d89a22' : '#d84d5b',
  });
  await chrome.action.setTitle({
    title: `${active.status === 'paused' ? 'Timer pausado' : 'Timer ativo'} · ${formatFullDuration(seconds)} · Chamado #${active.issueId}`,
  });
}

function formatFullDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainder}`;
}

async function notifyTimer(
  state: Awaited<ReturnType<StateRepository['load']>>,
  event: string,
): Promise<void> {
  setLanguage(state.preferences.language);
  if (!state.preferences.notificationsEnabled || !chrome.notifications?.create) return;
  const active = state.sessions.find((session) => session.status === 'running' || session.status === 'paused');
  if (event === 'PAUSE_SESSION' && active && state.preferences.notifyOnPause) {
    await chrome.notifications.create(`geja-paused-${active.id}`, {
      type: 'basic', iconUrl: 'icons/icon-128.png', title: t('pausedTimer'),
      message: `${t('pausedSession')} #${active.issueId}`,
      buttons: [{ title: t('resumeAction') }],
    });
  }
  if (event === 'STOP_SESSION' && state.preferences.notifyOnStop) {
    const pending = [...state.sessions]
      .filter((session) => session.status === 'pending')
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    if (pending)
      await chrome.notifications.create(`geja-stopped-${pending.id}`, {
        type: 'basic', iconUrl: 'icons/icon-128.png', title: t('sessionSaved'),
        message: `${t('pendingEntries')}: #${pending.issueId}.`,
        buttons: [{ title: t('launchNow') }, { title: t('openIssueAction') }],
      });
  }
  if (!active || active.status !== 'running') return;
  const seconds = getDisplayedDuration(active, new Date().toISOString());
  const threshold = state.preferences.notifyLongRunningMinutes * 60;
  if (seconds >= threshold && longRunningNoticeSessionId !== active.id) {
    longRunningNoticeSessionId = active.id;
    await chrome.notifications.create(`geja-long-${active.id}`, {
      type: 'basic', iconUrl: 'icons/icon-128.png', title: t('runningTimer'),
      message: `#${active.issueId} · ${formatFullDuration(seconds)}`,
      buttons: [{ title: t('pauseAction') }, { title: t('openIssueAction') }],
    });
  }
}

async function notifyReconciliation(
  state: Awaited<ReturnType<StateRepository['load']>>,
  sessionId: string,
): Promise<void> {
  setLanguage(state.preferences.language);
  if (!state.preferences.notificationsEnabled || !state.preferences.notifyOnReconciliation || !chrome.notifications?.create) return;
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  await chrome.notifications.create(`geja-reconciliation-${session.id}`, {
    type: 'basic', iconUrl: 'icons/icon-128.png', title: t('verificationRequired'),
    message: `${t('verificationRequired')}: #${session.issueId}.`,
    buttons: [{ title: t('openPendingEntries') }],
  });
}

async function openHoursWindow(): Promise<void> {
  await chrome.windows.create({
    url: `${chrome.runtime.getURL('popup.html')}?tab=hours`,
    type: 'popup',
    width: 430,
    height: 680,
  });
}

async function handleNotificationButton(
  notificationId: string,
  buttonIndex: number,
): Promise<void> {
  const state = await repository.load();
  if (!state.account) return;
  const prefix = notificationId.split('-')[1];
  const sessionId = notificationId.split('-').slice(2).join('-');
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;

  if ((prefix === 'paused' && buttonIndex === 0) || (prefix === 'long' && buttonIndex === 0)) {
    const scoped = state.sessions.filter((item) => item.accountId === state.account?.accountId);
    const timer = activeState(scoped);
    const next = prefix === 'paused'
      ? resumeSession(timer, new Date().toISOString())
      : pauseSession(timer, new Date().toISOString());
    const updated = await repository.update((value) => ({
      ...value,
      sessions: value.sessions.filter((item) => item.accountId !== state.account?.accountId).concat(next.sessions),
    }));
    await updateActionIndicator(updated);
  } else if ((prefix === 'long' || prefix === 'stopped') && buttonIndex === (prefix === 'long' ? 1 : 1)) {
    await chrome.tabs.create({ url: redmineIssueUrl(state.account.redmineUrl, session.issueId) });
  } else if (prefix === 'stopped' && buttonIndex === 0) {
    await openHoursWindow();
  } else if (prefix === 'reconciliation' && buttonIndex === 0) {
    await openHoursWindow();
  }
  await chrome.notifications.clear(notificationId);
}

export default defineBackground(() => {
  if (chrome.sidePanel?.setPanelBehavior)
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => undefined);
  void repository
    .load()
    .then(async (state) => {
      await updateActionIndicator(state);
      await syncContentScript(
        state.account?.redmineUrl,
        state.preferences.showCurrentIssueTimer ||
          state.preferences.showFloatingWidget,
      );
    });
  chrome.alarms?.create('geja-timer-indicator', { periodInMinutes: 1 });
  chrome.alarms?.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'geja-timer-indicator') return;
    void repository.load().then(async (state) => {
      await updateActionIndicator(state);
      await notifyTimer(state, 'alarm');
    });
  });
  chrome.notifications?.onButtonClicked?.addListener((notificationId, buttonIndex) => {
    void handleNotificationButton(notificationId, buttonIndex).catch(() => undefined);
  });
  chrome.commands?.onCommand.addListener((command) => {
    if (
      command !== 'start-or-resume-timer' &&
      command !== 'pause-timer' &&
      command !== 'stop-timer'
    )
      return;
    void handleKeyboardCommand(command).catch(() => undefined);
  });
  chrome.permissions.onRemoved.addListener(({ origins = [] }) => {
    void repository.load().then(async (state) => {
      if (
        state.account &&
        origins.includes(redmineOriginPattern(state.account.redmineUrl))
      )
        await syncContentScript(undefined, false);
    });
  });
  chrome.tabs?.onRemoved.addListener((tabId) => {
    void pauseSessionOwnedByTab(tabId);
  });
  chrome.windows?.onRemoved.addListener((windowId) => {
    if (timerWindowId === windowId) timerWindowId = undefined;
  });
  chrome.runtime.onMessage.addListener(
    (
      message: RuntimeMessage,
      sender,
      sendResponse: (response: RuntimeResponse) => void,
    ) => {
      void handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => sendResponse(responseError(error)));
      return true;
    },
  );
});

async function handleKeyboardCommand(
  command: 'start-or-resume-timer' | 'pause-timer' | 'stop-timer',
): Promise<void> {
  const current = await repository.load();
  const active = current.account
    ? current.sessions.find(
        (session) =>
          session.accountId === current.account?.accountId &&
          (session.status === 'running' || session.status === 'paused'),
      )
    : undefined;
  const activeStatus =
    active?.status === 'running' || active?.status === 'paused'
      ? active.status
      : undefined;
  const action = resolveTimerKeyboardAction(command, activeStatus);
  if (action === 'noop' || !current.account) return;

  if (action === 'start') {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const issueId = tab?.url
      ? redmineIssueIdFromUrl(current.account.redmineUrl, tab.url)
      : undefined;
    if (!issueId) return;
    await assertRedmineHostPermission(current.account.redmineUrl);
    const client = new RedmineClient(
      current.account.redmineUrl,
      current.account.apiKey,
    );
    const { issue } = await client.issue(issueId);
    await handleMessage(
      {
        type: 'START_SESSION',
        issueId: issue.id,
        projectId: issue.project.id,
        ownerTabId: tab.id,
      },
      { tab },
    );
    return;
  }

  const timerMessage: RuntimeMessage =
    action === 'resume'
      ? { type: 'RESUME_SESSION' }
      : action === 'pause'
        ? { type: 'PAUSE_SESSION' }
        : { type: 'STOP_SESSION' };
  await handleMessage(timerMessage);
}

async function syncContentScript(
  redmineUrl: string | undefined,
  enabled: boolean,
): Promise<void> {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = registered
    .filter((script) => script.id === CONTENT_SCRIPT_ID)
    .map((script) => script.id as string);
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
  if (!redmineUrl || !enabled) return;
  try {
    await assertRedmineHostPermission(redmineUrl);
  } catch {
    return;
  }
  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      matches: [redmineOriginPattern(redmineUrl)],
      js: [CONTENT_SCRIPT_FILE],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
}

async function openTimerWindow(): Promise<void> {
  if (timerWindowId !== undefined) {
    try {
      await chrome.windows.get(timerWindowId);
      await chrome.windows.update(timerWindowId, { focused: true });
      return;
    } catch {
      timerWindowId = undefined;
    }
  }
  const anchor = await chrome.windows.getLastFocused().catch(() => null);
  const width = 350;
  // A altura inclui a moldura/barra de título do sistema; reservar espaço
  // suficiente evita cortar o conteúdo do mini widget.
  const height = 170;
  const left =
    typeof anchor?.left === 'number' && typeof anchor.width === 'number'
      ? Math.max(0, anchor.left + anchor.width - width - 20)
      : undefined;
  const top =
    typeof anchor?.top === 'number' ? Math.max(0, anchor.top + 56) : undefined;
  const created = await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html?mode=timer-window'),
    type: 'popup',
    width,
    height,
    ...(left === undefined ? {} : { left }),
    ...(top === undefined ? {} : { top }),
    focused: true,
  });
  timerWindowId = created?.id;
}

async function closeTimerWindowIfInactive(
  state: Awaited<ReturnType<StateRepository['load']>>,
): Promise<void> {
  if (
    !state.preferences.closeTimerWindowWhenInactive ||
    state.sessions.some(
      (session) => session.status === 'running' || session.status === 'paused',
    ) ||
    timerWindowId === undefined
  )
    return;
  try {
    await chrome.windows.remove(timerWindowId);
  } catch {
    // A janela pode ter sido fechada manualmente antes da operação terminar.
  }
  timerWindowId = undefined;
}

async function pauseSessionOwnedByTab(tabId: number): Promise<void> {
  const current = await repository.load();
  if (!current.preferences.pauseOnTabClose || !current.account) return;
  const accountId = current.account.accountId;
  const scoped = current.sessions.filter(
    (session) => session.accountId === accountId,
  );
  const active = scoped.find(
    (session) => session.ownerTabId === tabId && session.status === 'running',
  );
  if (!active) return;
  const paused = pauseSession(
    { activeSession: active, sessions: scoped },
    new Date().toISOString(),
  );
  await repository.update((value) => ({
    ...value,
    sessions: value.sessions
      .filter((session) => session.accountId !== accountId)
      .concat(paused.sessions),
  }));
}

async function handleMessage(
  message: RuntimeMessage,
  sender?: chrome.runtime.MessageSender,
): Promise<RuntimeResponse> {
  try {
    if (message.type === 'GET_STATE')
      {
        const state = await repository.load();
        await updateActionIndicator(state);
        return { ok: true, state: publicState(state) };
      }
    if (message.type === 'GET_DIAGNOSTICS') {
      const state = await repository.load();
      let permissionGranted = false;
      if (state.account) {
        permissionGranted = await chrome.permissions.contains({
          origins: [redmineOriginPattern(state.account.redmineUrl)],
        });
      }
      const scoped = state.account
        ? state.sessions.filter((session) => session.accountId === state.account?.accountId)
        : [];
      const active = scoped.find(
        (session) => session.status === 'running' || session.status === 'paused',
      );
      return {
        ok: true,
        state: publicState(state),
        diagnostics: {
          accountConnected: Boolean(state.account),
          accountId: state.account?.accountId,
          redmineUrl: state.account?.redmineUrl,
          permissionGranted,
          schemaVersion: state.schemaVersion,
          sessionCount: scoped.length,
          pendingCount: scoped.filter(
            (session) =>
              session.status === 'pending' ||
              session.status === 'reconciliation_required',
          ).length,
          activeIssueId: active?.issueId,
        },
      };
    }
    if (message.type === 'SAVE_BOARD') {
      const state = await repository.update((value) => ({
        ...value,
        board: normalizeBoard(message.board),
      }));
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'SAVE_BOARDS') {
      const state = await repository.update((value) => {
        const boards = message.boards.filter((board) => board.accountId === value.account?.accountId);
        const selected = boards.find((board) => board.id === message.activeBoardId);
        return {
          ...value,
          boards,
          activeBoardId: selected?.id ?? boards[0]?.id ?? null,
          board: selected ?? value.board,
        };
      });
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'OPEN_WINDOW') {
      const query = message.tab ? `?tab=${message.tab}` : '';
      await chrome.windows.create({
        url: `${chrome.runtime.getURL('popup.html')}${query}`,
        type: 'popup',
        width: 430,
        height: 680,
      });
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'OPEN_TIMER_WINDOW') {
      await openTimerWindow();
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'OPEN_BOARD_WINDOW') {
      await chrome.windows.create({
        url: `${chrome.runtime.getURL('popup.html')}?tab=board&mode=board-window`,
        type: 'popup',
        width: 1100,
        height: 760,
      });
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'OPEN_SIDE_PANEL') {
      const focused = await chrome.windows.getLastFocused();
      if (!focused.id) throw new Error('Não foi possível identificar a janela do Chrome.');
      await chrome.sidePanel.open({ windowId: focused.id });
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'OPEN_ACTIVE_ISSUE') {
      const current = await repository.load();
      if (!current.account) throw new Error('Configure o Redmine antes de abrir o chamado.');
      await chrome.tabs.create({
        url: redmineIssueUrl(current.account.redmineUrl, message.issueId),
      });
      return { ok: true, state: publicState(current) };
    }
    if (message.type === 'SAVE_CONFIG') {
      const url = normalizeRedmineUrl(message.url);
      const state = await repository.update((current) => ({
        ...current,
        savedConfig: {
          redmineUrl: url,
          apiKey:
            message.apiKey ||
            current.savedConfig?.apiKey ||
            current.account?.apiKey ||
            '',
        },
      }));
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'CONNECT') {
      const current = await repository.load();
      const url = normalizeRedmineUrl(message.url);
      if (isInsecureRedmineUrl(url) && !message.allowInsecureHttp)
        throw new Error(
          'A conexão HTTP exige confirmação explícita e não protege a API Key em trânsito.',
        );
      await assertRedmineHostPermission(url);
      const storedUrl =
        current.savedConfig?.redmineUrl === url
          ? current.savedConfig.apiKey
          : current.account?.redmineUrl === url
            ? current.account.apiKey
            : '';
      const apiKey = message.apiKey || storedUrl;
      if (!apiKey)
        throw new Error(
          'Informe a API Key ou salve as configurações antes de testar a conexão.',
        );
      const client = new RedmineClient(url, apiKey);
      const { user } = await client.currentUser();
      const accountId = await buildAccountId(url, user.id);
      const now = new Date().toISOString();
      const state = await repository.update((current) => ({
        ...current,
        savedConfig: { redmineUrl: url, apiKey },
        account: {
          accountId,
          redmineUrl: url,
          apiKey,
          user: {
            id: user.id,
            name: `${user.firstname} ${user.lastname}`.trim(),
            login: user.login,
          },
          connectedAt: now,
        },
      }));
      await syncContentScript(
        url,
        state.preferences.showCurrentIssueTimer ||
          state.preferences.showFloatingWidget,
      );
      return {
        ok: true,
        state: publicState(state),
        account: state.account ? { ...state.account, apiKey: '' } : undefined,
      };
    }
    const current = await repository.load();
    if (!current.account)
      throw new Error('Configure o Redmine antes de usar o timer.');
    if (message.type === 'IMPORT_LOCAL_BACKUP') {
      const backup = parseLocalBackup(message.backup, current.account.accountId);
      const state = await repository.update((value) => ({
        ...value,
        preferences: { ...value.preferences, ...backup.preferences },
        sessions: value.sessions
          .filter((session) => session.accountId !== current.account?.accountId)
          .concat(backup.sessions),
      }));
      await updateActionIndicator(state);
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'GET_ISSUES') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const issues = await client.issues(
        message.scope === 'all' ? {} : { assigned_to_id: 'me' },
      );
      return { ok: true, state: publicState(current), issues };
    }
    if (message.type === 'GET_ISSUE') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const { issue } = await client.issue(message.issueId);
      return { ok: true, state: publicState(current), issue };
    }
    if (message.type === 'GET_PROJECTS') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const projects = await client.projects();
      return { ok: true, state: publicState(current), projects };
    }
    if (message.type === 'CREATE_ISSUE') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const subject = message.subject.trim();
      if (!message.projectId || !subject)
        throw new Error('Informe o projeto e o assunto do chamado.');
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const result = await client.createIssue({
        project_id: message.projectId,
        subject,
        ...(message.description.trim() ? { description: message.description.trim() } : {}),
        ...(message.trackerId ? { tracker_id: message.trackerId } : {}),
        ...(message.statusId ? { status_id: message.statusId } : {}),
        ...(message.priorityId ? { priority_id: message.priorityId } : {}),
      });
      return {
        ok: true,
        state: publicState(current),
        createdIssue: result.issue,
      };
    }
    if (message.type === 'GET_TIME_ENTRIES') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const timeEntries = await client.timeEntries({
        user_id: current.account.user.id,
        ...(message.issueId ? { issue_id: message.issueId } : {}),
        ...(message.from ? { from: message.from } : {}),
        ...(message.to ? { to: message.to } : {}),
      });
      return { ok: true, state: publicState(current), timeEntries };
    }
    if (message.type === 'GET_ACTIVITIES') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const { time_entry_activities } = await client.activities();
      return {
        ok: true,
        state: publicState(current),
        activities: time_entry_activities,
      };
    }
    const accountId = current.account.accountId;
    const scoped = current.sessions.filter(
      (session) => session.accountId === accountId,
    );
    const timerState = { ...createTimerState(), ...activeState(scoped) };
    const now = new Date().toISOString();
    let nextTimer = timerState;
    if (message.type === 'LAUNCH_CURRENT_ISSUE') {
      const active = timerState.activeSession;
      const shouldStop =
        active &&
        active.issueId === message.issueId &&
        (active.status === 'running' || active.status === 'paused');
      if (shouldStop) nextTimer = stopSession(timerState, now);
      const state = await repository.update((value) => ({
        ...value,
        sessions: value.sessions
          .filter((session) => session.accountId !== accountId)
          .concat(nextTimer.sessions),
      }));
      await updateActionIndicator(state);
      const tab = shouldStop ? 'hours' : 'timer';
      await chrome.windows.create({
        url: `${chrome.runtime.getURL('popup.html')}?tab=${tab}`,
        type: 'popup',
        width: 430,
        height: 680,
      });
      return {
        ok: true,
        state: publicState(state),
        session: nextTimer.sessions.find(
          (session) => session.id === active?.id,
        ),
      };
    }
    if (message.type === 'START_SESSION') {
      if (timerState.activeSession && current.preferences.autoPause)
        nextTimer = stopSession(timerState, now);
      nextTimer = startSession(nextTimer, {
        accountId,
        issueId: message.issueId,
        projectId: message.projectId,
        userId: current.account.user.id,
        now,
        ownerTabId: sender?.tab?.id ?? message.ownerTabId,
      });
    }
    if (message.type === 'PAUSE_SESSION')
      nextTimer = pauseSession(timerState, now);
    if (message.type === 'RESUME_SESSION')
      nextTimer = resumeSession(timerState, now);
    if (message.type === 'STOP_SESSION')
      nextTimer = stopSession(timerState, now);
    if (message.type === 'UPDATE_ACTIVE_SESSION_DURATION')
      nextTimer = setActiveSessionDuration(
        timerState,
        message.durationSeconds,
        now,
      );
    if (message.type === 'UPDATE_SESSION_DRAFT') {
      const session = scoped.find((item) => item.id === message.sessionId);
      if (
        !session ||
        (session.status !== 'pending' &&
          session.status !== 'reconciliation_required')
      )
        throw new Error('Sessão pendente inválida para edição.');
      const state = await repository.update((value) => ({
        ...value,
        sessions: value.sessions.map((item) =>
          item.id === session.id
            ? {
                ...item,
                description: message.comments,
                activityId: message.activityId,
                spentOn: message.spentOn,
                draftHours: message.draftHours,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      }));
      return {
        ok: true,
        state: publicState(state),
        session: state.sessions.find((item) => item.id === session.id),
      };
    }
    if (message.type === 'DELETE_SESSION') {
      const session = scoped.find((item) => item.id === message.sessionId);
      if (
        !session ||
        (session.status !== 'pending' &&
          session.status !== 'reconciliation_required')
      )
        throw new Error('Sessão pendente inválida para exclusão.');
      const state = await repository.update((value) => ({
        ...value,
        sessions: value.sessions.filter((item) => item.id !== session.id),
      }));
      return { ok: true, state: publicState(state), session };
    }
    if (message.type === 'SUBMIT_SESSIONS') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const selected = message.sessionIds
        .map((id) => scoped.find((session) => session.id === id))
        .filter((session): session is TimeSession =>
          Boolean(
            session &&
            (session.status === 'pending' ||
              session.status === 'reconciliation_required'),
          ),
        );
      if (!selected.length)
        throw new Error('Nenhuma sessão pendente foi selecionada.');
      if (
        selected.some((session) => session.status === 'reconciliation_required')
      )
        throw new Error(
          'Sessões marcadas para reconciliação precisam ser verificadas individualmente antes de um novo envio.',
        );
      for (const session of selected) {
        const requestedHours =
          session.draftHours && session.draftHours > 0
            ? session.draftHours
            : session.durationSeconds / 3600;
        const hours =
          requestedHours > 0
            ? Math.max(0.01, Math.round(requestedHours * 100) / 100)
            : getSuggestedEntryHours(
                session.durationSeconds,
                current.preferences.roundToInterval,
              );
        if (hours <= 0 || !session.activityId)
          throw new Error(
            `A sessão #${session.issueId} precisa de duração e atividade antes do lançamento.`,
          );
        try {
          const result = await client.createTimeEntry({
            issue_id: session.issueId,
            hours,
            activity_id: session.activityId,
            comments: session.description,
            spent_on: session.spentOn,
          });
          await repository.update((value) => ({
            ...value,
            sessions: value.sessions.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    status: 'submitted',
                    timeEntryId: result.time_entry.id,
                    submittedAt: new Date().toISOString(),
                    draftHours: null,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          }));
        } catch (error) {
          if (
            error instanceof Error &&
            (error as { status?: number }).status === 0
          ) {
            const reconciled = await repository.update((value) => ({
              ...value,
              sessions: value.sessions.map((item) =>
                item.id === session.id
                  ? {
                      ...item,
                      status: 'reconciliation_required',
                      updatedAt: new Date().toISOString(),
                    }
                  : item,
              ),
            }));
            await notifyReconciliation(reconciled, session.id);
          }
          throw error;
        }
      }
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'RECONCILE_SESSION') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const session = scoped.find((item) => item.id === message.sessionId);
      if (!session || session.status !== 'reconciliation_required')
        throw new Error('A sessão não está aguardando reconciliação.');
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const expectedHours = Math.round(
        (session.draftHours && session.draftHours > 0
          ? session.draftHours
          : session.durationSeconds / 3600) * 100,
      ) / 100;
      const entries = await client.timeEntries({
        user_id: current.account.user.id,
        issue_id: session.issueId,
        spent_on: session.spentOn,
      });
      const candidates = entries.filter(
        (entry) => Math.abs(entry.hours - expectedHours) < 0.01,
      );
      if (candidates.length > 1)
        throw new Error(
          'Foram encontrados vários apontamentos compatíveis. Verifique o histórico do Redmine manualmente antes de continuar.',
        );
      const state = await repository.update((value) => ({
        ...value,
        sessions: value.sessions.map((item) =>
          item.id === session.id
            ? candidates.length === 1
              ? {
                  ...item,
                  status: 'submitted',
                  timeEntryId: candidates[0].id,
                  submittedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : {
                  ...item,
                  status: 'pending',
                  updatedAt: new Date().toISOString(),
                }
            : item,
        ),
      }));
      return {
        ok: true,
        state: publicState(state),
        session: state.sessions.find((item) => item.id === session.id),
      };
    }
    if (message.type === 'SAVE_PREFERENCES') {
      const state = await repository.update((value) => ({
        ...value,
        preferences: message.preferences,
      }));
      await syncContentScript(
        state.account?.redmineUrl,
        state.preferences.showCurrentIssueTimer ||
          state.preferences.showFloatingWidget,
      );
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'SUBMIT_SESSION') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(
        current.account.redmineUrl,
        current.account.apiKey,
      );
      const session = scoped.find((item) => item.id === message.sessionId);
      if (
        !session ||
        session.accountId !== accountId ||
        session.status !== 'pending'
      )
        throw new Error('Sessão pendente inválida para esta conta.');
      const requestedHours =
        Number.isFinite(message.hours) && message.hours > 0
          ? message.hours
          : session.durationSeconds / 3600;
      const submittedHours =
        requestedHours > 0
          ? Math.max(0.01, Math.round(requestedHours * 100) / 100)
          : getSuggestedEntryHours(
              session.durationSeconds,
              current.preferences.roundToInterval,
            );
      if (submittedHours <= 0)
        throw new Error(
          'A sessão não possui duração suficiente para lançamento.',
        );
      try {
        const result = await client.createTimeEntry({
          issue_id: session.issueId,
          hours: submittedHours,
          activity_id: message.activityId,
          comments: message.comments,
          spent_on: message.spentOn,
        });
        const state = await repository.update((value) => ({
          ...value,
          sessions: value.sessions.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  status: 'submitted',
                  timeEntryId: result.time_entry.id,
                  submittedAt: new Date().toISOString(),
                  description: message.comments,
                  activityId: message.activityId,
                  spentOn: message.spentOn,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        }));
        return {
          ok: true,
          state: publicState(state),
          session: state.sessions.find((item) => item.id === session.id),
        };
      } catch (error) {
        if (
          error instanceof Error &&
          (error as { status?: number }).status === 0
        ) {
          const state = await repository.update((value) => ({
            ...value,
            sessions: value.sessions.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    status: 'reconciliation_required',
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          }));
          await notifyReconciliation(state, session.id);
          return {
            ok: false,
            error: `Não foi possível confirmar o lançamento. A sessão foi marcada para reconciliação. ${error.message}`,
          };
        }
        throw error;
      }
    }
    const state = await repository.update((value) => ({
      ...value,
      sessions: value.sessions
        .filter((session) => session.accountId !== accountId)
        .concat(nextTimer.sessions),
    }));
    await updateActionIndicator(state);
    await notifyTimer(state, message.type);
    if (
      message.type === 'START_SESSION' &&
      state.preferences.timerWindowBehavior === 'on-start'
    )
      await openTimerWindow();
    await closeTimerWindowIfInactive(state);
    return {
      ok: true,
      state: publicState(state),
      session: nextTimer.activeSession ?? nextTimer.sessions.at(-1),
    };
  } catch (error) {
    return responseError(error);
  }
}
