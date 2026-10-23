/// <reference path="../.wxt/types/imports-module.d.ts" />
import { RedmineClient, buildAccountId } from '@/services/redmine/client';
import { StateRepository } from '@/services/storage/repository';
import { createTimerState, pauseSession, resumeSession, startSession, stopSession } from '@/domain/timer';
import type { RuntimeMessage, RuntimeResponse } from '@/services/messaging/protocol';
import type { TimeSession } from '@/domain/types';
import { defineBackground } from '#imports';
import { assertRedmineHostPermission, isInsecureRedmineUrl, normalizeRedmineUrl, redmineOriginPattern } from '@/services/permissions/host';
import { getSuggestedEntryHours } from '@/domain/preferences';

const repository = new StateRepository();
const CONTENT_SCRIPT_ID = 'geja-redmine-issue-timer';
const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';

const responseError = (error: unknown): RuntimeResponse => ({ ok: false, error: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.' });
const activeState = (sessions: TimeSession[]) => ({ activeSession: sessions.find((session) => session.status === 'running' || session.status === 'paused') ?? null, sessions });
const publicState = (state: Awaited<ReturnType<StateRepository['load']>>) => ({ ...state, account: state.account ? { ...state.account, apiKey: '' } : null, savedConfig: state.savedConfig ? { ...state.savedConfig, apiKey: '' } : null });

export default defineBackground(() => {
  if (chrome.sidePanel?.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
  void repository.load().then((state) => syncContentScript(state.account?.redmineUrl, state.preferences.showCurrentIssueTimer));
  chrome.permissions.onRemoved.addListener(({ origins = [] }) => {
    void repository.load().then(async (state) => {
      if (state.account && origins.includes(redmineOriginPattern(state.account.redmineUrl))) await syncContentScript(undefined, false);
    });
  });
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    void handleMessage(message).then(sendResponse).catch((error) => sendResponse(responseError(error)));
    return true;
  });
});

async function syncContentScript(redmineUrl: string | undefined, enabled: boolean): Promise<void> {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = registered.filter((script) => script.id === CONTENT_SCRIPT_ID).map((script) => script.id as string);
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
  if (!redmineUrl || !enabled) return;
  try { await assertRedmineHostPermission(redmineUrl); } catch { return; }
  await chrome.scripting.registerContentScripts([{ id: CONTENT_SCRIPT_ID, matches: [redmineOriginPattern(redmineUrl)], js: [CONTENT_SCRIPT_FILE], runAt: 'document_idle', persistAcrossSessions: true }]);
}

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  try {
    if (message.type === 'GET_STATE') return { ok: true, state: publicState(await repository.load()) };
    if (message.type === 'OPEN_WINDOW') {
      const query = message.tab ? `?tab=${message.tab}` : '';
      await chrome.windows.create({ url: `${chrome.runtime.getURL('popup.html')}${query}`, type: 'popup', width: 430, height: 680 });
      return { ok: true, state: publicState(await repository.load()) };
    }
    if (message.type === 'SAVE_CONFIG') {
      const url = normalizeRedmineUrl(message.url);
      const state = await repository.update((current) => ({ ...current, savedConfig: { redmineUrl: url, apiKey: message.apiKey || current.savedConfig?.apiKey || current.account?.apiKey || '' } }));
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'CONNECT') {
      const current = await repository.load();
      const url = normalizeRedmineUrl(message.url);
      if (isInsecureRedmineUrl(url) && !message.allowInsecureHttp) throw new Error('A conexão HTTP exige confirmação explícita e não protege a API Key em trânsito.');
      await assertRedmineHostPermission(url);
      const storedUrl = current.savedConfig?.redmineUrl === url ? current.savedConfig.apiKey : current.account?.redmineUrl === url ? current.account.apiKey : '';
      const apiKey = message.apiKey || storedUrl;
      if (!apiKey) throw new Error('Informe a API Key ou salve as configurações antes de testar a conexão.');
      const client = new RedmineClient(url, apiKey);
      const { user } = await client.currentUser();
      const accountId = await buildAccountId(url, user.id);
      const now = new Date().toISOString();
      const state = await repository.update((current) => ({ ...current, savedConfig: { redmineUrl: url, apiKey }, account: { accountId, redmineUrl: url, apiKey, user: { id: user.id, name: `${user.firstname} ${user.lastname}`.trim(), login: user.login }, connectedAt: now } }));
      await syncContentScript(url, state.preferences.showCurrentIssueTimer);
      return { ok: true, state: publicState(state), account: state.account ? { ...state.account, apiKey: '' } : undefined };
    }
    const current = await repository.load();
    if (!current.account) throw new Error('Configure o Redmine antes de usar o timer.');
    if (message.type === 'GET_ISSUES') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(current.account.redmineUrl, current.account.apiKey);
      const issues = await client.issues(message.search ? { assigned_to_id: 'me', subject: message.search } : { assigned_to_id: 'me' });
      return { ok: true, state: publicState(current), issues };
    }
    if (message.type === 'GET_ACTIVITIES') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(current.account.redmineUrl, current.account.apiKey);
      const { time_entry_activities } = await client.activities();
      return { ok: true, state: publicState(current), activities: time_entry_activities };
    }
    const accountId = current.account.accountId;
    const scoped = current.sessions.filter((session) => session.accountId === accountId);
    const timerState = { ...createTimerState(), ...activeState(scoped) };
    const now = new Date().toISOString();
    let nextTimer = timerState;
    if (message.type === 'LAUNCH_CURRENT_ISSUE') {
      const active = timerState.activeSession;
      const shouldStop = active && active.issueId === message.issueId && (active.status === 'running' || active.status === 'paused');
      if (shouldStop) nextTimer = stopSession(timerState, now);
      const state = await repository.update((value) => ({ ...value, sessions: value.sessions.filter((session) => session.accountId !== accountId).concat(nextTimer.sessions) }));
      const tab = shouldStop ? 'hours' : 'timer';
      await chrome.windows.create({ url: `${chrome.runtime.getURL('popup.html')}?tab=${tab}`, type: 'popup', width: 430, height: 680 });
      return { ok: true, state: publicState(state), session: nextTimer.sessions.find((session) => session.id === active?.id) };
    }
    if (message.type === 'START_SESSION') {
      if (timerState.activeSession && current.preferences.autoPause) nextTimer = stopSession(timerState, now);
      nextTimer = startSession(nextTimer, { accountId, issueId: message.issueId, projectId: message.projectId, userId: current.account.user.id, now });
    }
    if (message.type === 'PAUSE_SESSION') nextTimer = pauseSession(timerState, now);
    if (message.type === 'RESUME_SESSION') nextTimer = resumeSession(timerState, now);
    if (message.type === 'STOP_SESSION') nextTimer = stopSession(timerState, now);
    if (message.type === 'SAVE_PREFERENCES') {
      const state = await repository.update((value) => ({ ...value, preferences: message.preferences }));
      await syncContentScript(state.account?.redmineUrl, state.preferences.showCurrentIssueTimer);
      return { ok: true, state: publicState(state) };
    }
    if (message.type === 'SUBMIT_SESSION') {
      await assertRedmineHostPermission(current.account.redmineUrl);
      const client = new RedmineClient(current.account.redmineUrl, current.account.apiKey);
      const session = scoped.find((item) => item.id === message.sessionId);
      if (!session || session.accountId !== accountId || session.status !== 'pending') throw new Error('Sessão pendente inválida para esta conta.');
      const requestedHours = Number.isFinite(message.hours) && message.hours > 0
        ? message.hours
        : session.durationSeconds / 3600;
      const submittedHours = requestedHours > 0 ? Math.max(0.01, Math.round(requestedHours * 100) / 100) : getSuggestedEntryHours(session.durationSeconds, current.preferences.roundToInterval);
      if (submittedHours <= 0) throw new Error('A sessão não possui duração suficiente para lançamento.');
      try {
        const result = await client.createTimeEntry({ issue_id: session.issueId, hours: submittedHours, activity_id: message.activityId, comments: message.comments, spent_on: message.spentOn });
        const state = await repository.update((value) => ({ ...value, sessions: value.sessions.map((item) => item.id === session.id ? { ...item, status: 'submitted', timeEntryId: result.time_entry.id, submittedAt: new Date().toISOString(), description: message.comments, activityId: message.activityId, spentOn: message.spentOn, updatedAt: new Date().toISOString() } : item) }));
        return { ok: true, state: publicState(state), session: state.sessions.find((item) => item.id === session.id) };
      } catch (error) {
        if (error instanceof Error && (error as { status?: number }).status === 0) {
          const state = await repository.update((value) => ({ ...value, sessions: value.sessions.map((item) => item.id === session.id ? { ...item, status: 'reconciliation_required', updatedAt: new Date().toISOString() } : item) }));
          return { ok: false, error: `Não foi possível confirmar o lançamento. A sessão foi marcada para reconciliação. ${error.message}` };
        }
        throw error;
      }
    }
    const state = await repository.update((value) => ({ ...value, sessions: value.sessions.filter((session) => session.accountId !== accountId).concat(nextTimer.sessions) }));
    return { ok: true, state: publicState(state), session: nextTimer.activeSession ?? nextTimer.sessions.at(-1) };
  } catch (error) { return responseError(error); }
}
