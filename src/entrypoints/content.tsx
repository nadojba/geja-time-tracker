/// <reference path="../../.wxt/types/imports-module.d.ts" />
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Play, CircleStop, Pause, Send } from 'lucide-react';
import { defineContentScript } from '#imports';
import { getIssueDisplayedDuration } from '@/domain/timer';
import type { TimeSession } from '@/domain/types';
import {
  defaultPreferences,
  getSuggestedEntryHours,
  shouldConfirmIssueSwitch,
  type Preferences,
} from '@/domain/preferences';
import { getTimerDocumentTitle } from '@/utils/document-title';
import {
  parseTimerDuration,
  splitTimerDuration,
  type TimerDurationFields,
} from '@/utils/timer-duration';
import { setLanguage, translate as t, translateError } from '@/i18n';

const HOST_ID = 'redmine-time-tracker-control';
const issueIdFromLocation = () => {
  const match = location.pathname.match(/^\/issues\/(\d+)/);
  return match ? Number(match[1]) : null;
};

type RuntimeMessage = {
  type: string;
  [key: string]: unknown;
};

function sendRuntimeMessage<T = unknown>(
  message: RuntimeMessage,
  callback?: (result: T | undefined) => void,
) {
  try {
    if (!chrome.runtime?.id) return false;

    chrome.runtime.sendMessage(message, (result: T) => {
      // A extensão pode ser recarregada enquanto a página continua aberta.
      // Nesse caso o callback antigo pode receber lastError ou nem ser concluído.
      if (chrome.runtime.lastError) {
        callback?.(undefined);
        return;
      }
      callback?.(result);
    });
    return true;
  } catch {
    // O contexto antigo do content script foi invalidado. A página será
    // atualizada naturalmente quando o usuário recarregar a extensão/página.
    return false;
  }
}

function requestRuntimeMessage<T>(
  message: RuntimeMessage,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const sent = sendRuntimeMessage<T>(message, resolve);
    if (!sent) resolve(undefined);
  });
}

type Activity = { id: number; name: string };
type LaunchForm = {
  session: TimeSession;
  activities: Activity[];
  hours: string;
  activityId: string;
  comments: string;
};

function InlineControl({ issueId }: { issueId: number }) {
  const [snapshot, setSnapshot] = useState<{
    active?: { issueId: number; status: string };
    seconds: number;
    preferences: Pick<
      Preferences,
      | 'theme'
      | 'accentColor'
      | 'widgetStyle'
      | 'widgetTimerSize'
      | 'showFloatingWidget'
      | 'showCurrentIssueTimer'
      | 'roundToInterval'
      | 'autoPause'
      | 'confirmBeforeSwitchingIssues'
    >;
  }>({ seconds: 0, preferences: defaultPreferences });
  const [launchForm, setLaunchForm] = useState<LaunchForm | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationFields, setDurationFields] = useState<TimerDurationFields>(() =>
    splitTimerDuration(0),
  );
  const [durationError, setDurationError] = useState('');
  const [durationBusy, setDurationBusy] = useState(false);
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const originalTitle = useRef(document.title);
  useEffect(() => {
    let contextValid = true;
    const refresh = () => {
      if (!contextValid) return;
      const sent = sendRuntimeMessage<{
        ok: boolean;
        state?: { sessions: TimeSession[]; preferences: Preferences };
      }>({ type: 'GET_STATE' }, (result) => {
        if (!result?.ok || !result.state) return;
        setLanguage(result.state.preferences.language);
        const active = result.state.sessions.find(
          (session) =>
            session.status === 'running' || session.status === 'paused',
        );
        setSnapshot({
          active,
          seconds: active
            ? getIssueDisplayedDuration(
                active,
                issueId,
                new Date().toISOString(),
              )
            : 0,
          preferences: result.state.preferences,
        });
      });
      if (!sent) contextValid = false;
    };

    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      contextValid = false;
      window.clearInterval(interval);
    };
  }, []);
  const active = snapshot.active?.issueId === issueId;
  const act = (message: RuntimeMessage) => sendRuntimeMessage(message);
  const runningOnThisIssue = active && snapshot.active?.status === 'running';
  const pausedOnThisIssue = active && snapshot.active?.status === 'paused';
  const floatingWidget = Boolean(
    snapshot.preferences.showFloatingWidget && active,
  );
  const showWidget = Boolean(
    snapshot.preferences.showCurrentIssueTimer || floatingWidget,
  );
  useEffect(() => {
    if (editingDuration) hoursInputRef.current?.focus();
  }, [editingDuration]);
  useEffect(() => {
    const activeOnThisIssue = Boolean(runningOnThisIssue || pausedOnThisIssue);
    document.title = getTimerDocumentTitle(
      originalTitle.current,
      snapshot.seconds,
      activeOnThisIssue,
    );
    return () => {
      document.title = getTimerDocumentTitle(originalTitle.current, 0, false);
    };
  }, [issueId, runningOnThisIssue, pausedOnThisIssue, snapshot.seconds]);
  const startOnThisIssue = () => {
    if (
      snapshot.preferences.autoPause &&
      shouldConfirmIssueSwitch(
        snapshot.active?.issueId,
        issueId,
        snapshot.preferences,
      ) &&
      !window.confirm(
        `${t('switchIssueConfirm')} #${snapshot.active?.issueId}. ${t('switchIssueQuestion')}`,
      )
    )
      return;
    act({ type: 'START_SESSION', issueId, projectId: 0 });
  };
  const stopOnThisIssue = () => {
    if (
      snapshot.seconds > 0 &&
      !window.confirm(
        `${t('stopTimerConfirm')} #${issueId} ${new Date(snapshot.seconds * 1000).toISOString().slice(11, 19)}. ${t('stopTimerQuestion')}`,
      )
    )
      return;
    act({ type: 'STOP_SESSION' });
  };
  const openLaunch = async () => {
    if (!runningOnThisIssue && !pausedOnThisIssue) {
      act({ type: 'OPEN_WINDOW', tab: 'timer' });
      return;
    }

    setLaunchBusy(true);
    setLaunchError('');
    const stopped = await requestRuntimeMessage<{
      ok: boolean;
      error?: string;
      session?: TimeSession;
    }>({ type: 'STOP_SESSION' });
    if (!stopped?.ok || !stopped.session) {
      setLaunchError(stopped?.error ? translateError(stopped.error) : translateError('Não foi possível parar o timer.'));
      setLaunchBusy(false);
      return;
    }

    const activityResponse = await requestRuntimeMessage<{
      ok: boolean;
      error?: string;
      activities?: Activity[];
    }>({ type: 'GET_ACTIVITIES' });
    const activities = activityResponse?.ok
      ? (activityResponse.activities ?? [])
      : [];
    setLaunchForm({
      session: stopped.session,
      activities,
      hours: getSuggestedEntryHours(
        stopped.session.durationSeconds,
        snapshot.preferences.roundToInterval,
      ).toFixed(2),
      activityId: activities[0]?.id.toString() ?? '',
      comments: stopped.session.description,
    });
    if (!activityResponse?.ok)
      setLaunchError(
        activityResponse?.error ? translateError(activityResponse.error) : translateError('Não foi possível carregar as atividades.'),
      );
    setLaunchBusy(false);
  };
  const submitLaunch = async () => {
    if (!launchForm) return;
    const hours = Number(launchForm.hours.replace(',', '.'));
    if (!launchForm.activityId || !Number.isFinite(hours) || hours <= 0) {
      setLaunchError(t('validDurationActivity'));
      return;
    }
    setLaunchBusy(true);
    setLaunchError('');
    const result = await requestRuntimeMessage<{ ok: boolean; error?: string }>(
      {
        type: 'SUBMIT_SESSION',
        sessionId: launchForm.session.id,
        activityId: Number(launchForm.activityId),
        comments: launchForm.comments,
        spentOn: launchForm.session.spentOn,
        hours,
      },
    );
    if (!result?.ok)
      setLaunchError(result?.error ? translateError(result.error) : translateError('Não foi possível registrar as horas.'));
    else setLaunchForm(null);
    setLaunchBusy(false);
  };
  const closeLaunchForm = () => {
    if (!launchForm || launchBusy) return;
    const defaultHours = getSuggestedEntryHours(
      launchForm.session.durationSeconds,
      snapshot.preferences.roundToInterval,
    ).toFixed(2);
    const defaultActivityId = launchForm.activities[0]?.id.toString() ?? '';
    const changed =
      launchForm.hours !== defaultHours ||
      launchForm.activityId !== defaultActivityId ||
      launchForm.comments !== launchForm.session.description;
    if (
      changed &&
      !window.confirm(t('unsavedLaunch'))
    )
      return;
    setLaunchForm(null);
    setLaunchError('');
  };
  useEffect(() => {
    if (!launchForm || launchBusy) return;
    const defaultHours = getSuggestedEntryHours(
      launchForm.session.durationSeconds,
      snapshot.preferences.roundToInterval,
    ).toFixed(2);
    const dirty =
      launchForm.hours !== defaultHours ||
      launchForm.activityId !== (launchForm.activities[0]?.id.toString() ?? '') ||
      launchForm.comments !== launchForm.session.description;
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [launchForm, launchBusy, snapshot.preferences.roundToInterval]);
  const beginDurationEdit = () => {
    if (!active) return;
    setDurationFields(splitTimerDuration(snapshot.seconds));
    setDurationError('');
    setEditingDuration(true);
  };
  const cancelDurationEdit = () => {
    if (durationBusy) return;
    const originalDuration = splitTimerDuration(snapshot.seconds);
    const durationChanged =
      durationFields.hours !== originalDuration.hours ||
      durationFields.minutes !== originalDuration.minutes ||
      durationFields.seconds !== originalDuration.seconds;
    if (
      durationChanged &&
      !window.confirm(t('unsavedDuration'))
    )
      return;
    setDurationError('');
    setEditingDuration(false);
  };
  const saveDurationEdit = async () => {
    if (!active || durationBusy) return;
    const parsed = parseTimerDuration(durationFields);
    if (parsed.seconds === undefined) {
      setDurationError(parsed.error ?? 'Informe uma duração válida.');
      return;
    }
    setDurationBusy(true);
    setDurationError('');
    const result = await requestRuntimeMessage<{ ok: boolean; error?: string }>({
      type: 'UPDATE_ACTIVE_SESSION_DURATION',
      durationSeconds: parsed.seconds,
    });
    if (!result?.ok) {
      setDurationError(result?.error ?? 'Não foi possível salvar a duração.');
    } else {
      setEditingDuration(false);
    }
    setDurationBusy(false);
  };
  const handleDurationKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelDurationEdit();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void saveDurationEdit();
    }
  };
  const accentColors: Record<Preferences['accentColor'], string> = {
    blue: '#2e5bd7',
    indigo: '#5b4bd8',
    green: '#168b68',
    violet: '#8a4fd1',
    orange: '#d77725',
  };
  const widgetStyle =
    snapshot.preferences.widgetStyle ?? defaultPreferences.widgetStyle;
  const inlineStyle = {
    '--rtt-accent':
      accentColors[snapshot.preferences.accentColor] ?? accentColors.blue,
  } as CSSProperties;
  return showWidget ? (
    <div
      className={`rtt-inline rtt-${widgetStyle} rtt-theme-${snapshot.preferences.theme} rtt-timer-${snapshot.preferences.widgetTimerSize ?? defaultPreferences.widgetTimerSize}${floatingWidget ? ' rtt-floating' : ''}`}
      style={inlineStyle}
    >
      {editingDuration && active ? (
        <div className="rtt-time-editor" onKeyDown={handleDurationKeyDown}>
          <input
            ref={hoursInputRef}
            className="rtt-duration-input"
            aria-label="Horas do timer"
            inputMode="numeric"
            value={durationFields.hours}
            onChange={(event) =>
              setDurationFields((current) => ({
                ...current,
                hours: event.target.value,
              }))
            }
          />
          <span>:</span>
          <input
            className="rtt-duration-input"
            aria-label="Minutos do timer"
            inputMode="numeric"
            value={durationFields.minutes}
            onChange={(event) =>
              setDurationFields((current) => ({
                ...current,
                minutes: event.target.value,
              }))
            }
          />
          <span>:</span>
          <input
            className="rtt-duration-input"
            aria-label="Segundos do timer"
            inputMode="numeric"
            value={durationFields.seconds}
            onChange={(event) =>
              setDurationFields((current) => ({
                ...current,
                seconds: event.target.value,
              }))
            }
          />
          <button
            type="button"
            className="rtt-duration-save"
            aria-label={t('saveDuration')}
            onClick={() => void saveDurationEdit()}
            disabled={durationBusy}
          >
            {durationBusy ? '…' : '✓'}
          </button>
          <button
            type="button"
            className="rtt-duration-cancel"
            aria-label={t('cancelDuration')}
            onClick={cancelDurationEdit}
            disabled={durationBusy}
          >
            ×
          </button>
          {durationError && (
            <span className="rtt-duration-error" role="alert">
              {durationError}
            </span>
          )}
        </div>
      ) : (
        <span
          className="rtt-time"
          onDoubleClick={beginDurationEdit}
          title={active ? t('editDuration') : undefined}
        >
          {new Date(snapshot.seconds * 1000).toISOString().slice(11, 19)}
        </span>
      )}
      {runningOnThisIssue ? (
        <>
          <button
            className="rtt-pause"
            title={t('pauseTimer')}
            aria-label={t('pauseTimer')}
            data-tooltip="Pausar timer"
            onClick={() => act({ type: 'PAUSE_SESSION' })}
          >
            <Pause size={14} /> {t('pause')}
          </button>
          <button
            className="rtt-stop"
            title={t('stopTimer')}
            aria-label={t('stopTimer')}
            data-tooltip={t('stopSavePending')}
            onClick={stopOnThisIssue}
          >
            <CircleStop size={14} /> {t('stop')}
          </button>
        </>
      ) : pausedOnThisIssue ? (
        <>
          <button
            className="rtt-resume"
            title={t('resumeTimer')}
          aria-label={t('resumeTimer')}
          data-tooltip={t('resumePaused')}
            onClick={() => act({ type: 'RESUME_SESSION' })}
          >
            <Play size={14} /> {t('resume')}
          </button>
          <button
            className="rtt-stop"
            title={t('stopTimer')}
            aria-label={t('stopTimer')}
            data-tooltip={t('stopSavePending')}
            onClick={stopOnThisIssue}
          >
            <CircleStop size={14} /> {t('stop')}
          </button>
        </>
      ) : (
        <button
          className="rtt-start"
          title={t('startTimer')}
          aria-label={t('startTimer')}
          data-tooltip={t('startNewSession')}
          onClick={startOnThisIssue}
        >
          <Play size={14} /> {t('start')}
        </button>
      )}
      <button
        className="rtt-launch"
        title={
          runningOnThisIssue || pausedOnThisIssue
            ? t('stopOpenEntry')
            : t('openEntries')
        }
        aria-label={
          runningOnThisIssue || pausedOnThisIssue
            ? t('stopOpenEntry')
            : t('openEntries')
        }
        data-tooltip={
          runningOnThisIssue || pausedOnThisIssue
            ? t('stopOpenEntry')
            : t('openPendingEntries')
        }
        onClick={() => void openLaunch()}
      >
        <Send size={14} /> {t('registerHours')}
      </button>
      {launchForm && (
        <div className="rtt-modal-backdrop" role="presentation">
          <div
            className="rtt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rtt-launch-title"
          >
            <div className="rtt-modal-header">
              <strong id="rtt-launch-title">
                {t('registerHours')} · #{launchForm.session.issueId}
              </strong>
              <button
                className="rtt-modal-close"
                aria-label="Fechar"
                data-tooltip={t('closeEntry')}
                onClick={closeLaunchForm}
              >
                ×
              </button>
            </div>
            <div className="rtt-modal-duration">
              {t('sessionEnded')}:{' '}
              <strong>
                {new Date(launchForm.session.durationSeconds * 1000)
                  .toISOString()
                  .slice(11, 19)}
              </strong>
            </div>
            {launchError && (
              <div className="rtt-modal-error">{launchError}</div>
            )}
            <label className="rtt-modal-label">
              {t('hours')}
              <input
                className="rtt-modal-input"
                type="text"
                inputMode="decimal"
                value={launchForm.hours}
                onChange={(event) =>
                  setLaunchForm((current) =>
                    current
                      ? { ...current, hours: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label className="rtt-modal-label">
              {t('activity')}
              <select
                className="rtt-modal-input"
                value={launchForm.activityId}
                onChange={(event) =>
                  setLaunchForm((current) =>
                    current
                      ? { ...current, activityId: event.target.value }
                      : current,
                  )
                }
              >
                <option value="">{t('activity')}…</option>
                {launchForm.activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="rtt-modal-label">
              {t('description')}
              <textarea
                className="rtt-modal-input"
                rows={3}
                value={launchForm.comments}
                onChange={(event) =>
                  setLaunchForm((current) =>
                    current
                      ? { ...current, comments: event.target.value }
                      : current,
                  )
                }
                placeholder={t('workDescription')}
              />
            </label>
            <div className="rtt-modal-actions">
              <button
                className="rtt-modal-secondary"
                onClick={closeLaunchForm}
              >
                {t('later')}
              </button>
              <button
                className="rtt-modal-primary"
                disabled={launchBusy || !launchForm.activityId}
                onClick={() => void submitLaunch()}
              >
                {launchBusy ? t('registering') : t('registerHours')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;
}

export default defineContentScript({
  registration: 'runtime',
  matches: [],
  runAt: 'document_idle',
  main() {
    const mount = () => {
      const issueId = issueIdFromLocation();
      if (!issueId || document.getElementById(HOST_ID)) return;

      const target = document.querySelector(
        '#content h2, #content .subject, .subject h3, h2',
      );
      const content = document.querySelector('#content');
      if (!target?.parentElement && !content) return;

      const host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'all: initial; display: block; margin: 8px 0;';
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent =
        '.rtt-inline{--rtt-accent:#2e5bd7;display:inline-flex;align-items:center;flex-wrap:wrap;gap:7px;border:1px solid #d6deec;border-radius:12px;padding:7px 9px;background:linear-gradient(135deg,#fff 0%,#f4f7fc 100%);box-shadow:0 5px 16px rgba(26,39,64,.14);font:13px/1.2 system-ui,sans-serif}.rtt-inline.rtt-minimal{border-color:transparent;padding:4px 0;background:transparent;box-shadow:none}.rtt-inline.rtt-prominent{border-color:var(--rtt-accent);background:linear-gradient(135deg,#fff 0%,color-mix(in srgb,var(--rtt-accent) 8%,#fff) 100%);box-shadow:0 6px 18px color-mix(in srgb,var(--rtt-accent) 24%,transparent)}.rtt-inline button{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:8px;padding:7px 10px;color:#fff;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:filter .15s ease,transform .15s ease}.rtt-inline button:hover{filter:brightness(.94);transform:translateY(-1px)}.rtt-inline button[data-tooltip]{position:relative}.rtt-inline button[data-tooltip]::after{position:absolute;left:50%;bottom:calc(100% + 8px);z-index:10;display:none;width:max-content;max-width:220px;border-radius:6px;padding:6px 8px;background:#17233e;color:#fff;content:attr(data-tooltip);font:600 11px/1.2 system-ui,sans-serif;pointer-events:none;transform:translateX(-50%);white-space:normal;box-shadow:0 5px 14px rgba(15,23,42,.22)}.rtt-inline button[data-tooltip]:hover::after,.rtt-inline button[data-tooltip]:focus-visible::after{display:block}.rtt-start,.rtt-resume{background:var(--rtt-accent)}.rtt-pause{background:#d89a22;box-shadow:0 3px 8px rgba(216,154,34,.24)}.rtt-stop{background:#d84d5b;box-shadow:0 3px 8px rgba(216,77,91,.24)}.rtt-launch,.rtt-window{background:#e9eef7;color:#30415f!important;border:1px solid #d1dbea!important}.rtt-window{background:#eef1f7!important}.rtt-time{min-width:67px;color:var(--rtt-accent);font-variant-numeric:tabular-nums;font-weight:800;text-align:center;letter-spacing:.02em}.rtt-timer-small .rtt-time{font-size:13px}.rtt-timer-medium .rtt-time{font-size:16px}.rtt-timer-large .rtt-time{font-size:20px}.rtt-timer-large{gap:9px;padding:9px 11px}';
      style.textContent +=
        '.rtt-floating{position:fixed;right:20px;bottom:20px;z-index:2147483646;max-width:calc(100vw - 40px);margin:0;border-color:var(--rtt-accent);box-shadow:0 10px 28px rgba(15,23,42,.24)}';
      style.textContent +=
        '.rtt-modal-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.42);font:13px/1.35 system-ui,sans-serif}.rtt-modal{width:min(360px,calc(100vw - 32px));border:1px solid #d6deec;border-radius:16px;padding:16px;background:#fff;color:#17233e;box-shadow:0 20px 60px rgba(15,23,42,.28)}.rtt-modal-header,.rtt-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.rtt-modal-header{margin-bottom:12px}.rtt-modal-close{border:0;background:transparent;color:#71809a;font-size:24px;line-height:1;cursor:pointer}.rtt-modal-duration{margin-bottom:12px;border-radius:9px;padding:9px 10px;background:#f2f6fb;color:#5d6d88}.rtt-modal-label{display:grid;gap:5px;margin-top:10px;color:#344563;font-weight:700}.rtt-modal-input{width:100%;border:1px solid #ccd8e8;border-radius:9px;padding:9px 10px;background:#fff;color:#17233e;font:inherit;box-sizing:border-box}.rtt-modal-error{margin:8px 0;border:1px solid #f1c9ca;border-radius:9px;padding:8px 10px;background:#fff5f5;color:#a33137}.rtt-modal-actions{justify-content:flex-end;margin-top:14px}.rtt-modal-primary,.rtt-modal-secondary{border:0;border-radius:9px;padding:9px 12px;font:700 12px system-ui,sans-serif;cursor:pointer}.rtt-modal-primary{background:var(--rtt-accent);color:#fff}.rtt-modal-primary:disabled{cursor:not-allowed;opacity:.5}.rtt-modal-secondary{background:#eaf0f8;color:#30415f}';
      style.textContent +=
        '.rtt-inline.rtt-theme-dark{border-color:#35496c;background:linear-gradient(135deg,#182943 0%,#111d31 100%);color:#e8effb}.rtt-inline.rtt-theme-dark.rtt-minimal{background:transparent;border-color:transparent}.rtt-inline.rtt-theme-dark .rtt-launch,.rtt-inline.rtt-theme-dark .rtt-window{background:#293a58!important;color:#e3ebfa!important;border-color:#3a4d70!important}.rtt-theme-dark .rtt-modal{border-color:#35496c;background:#182943;color:#e8effb}.rtt-theme-dark .rtt-modal-duration{background:#1d2d48;color:#b7c6dc}.rtt-theme-dark .rtt-modal-label{color:#c3d0e4}.rtt-theme-dark .rtt-modal-input{border-color:#3a4d70;background:#101a2c;color:#e8effb}.rtt-theme-dark .rtt-modal-secondary{background:#293a58;color:#e3ebfa}@media (prefers-color-scheme:dark){.rtt-inline.rtt-theme-system{border-color:#35496c;background:linear-gradient(135deg,#182943 0%,#111d31 100%);color:#e8effb}.rtt-inline.rtt-theme-system .rtt-launch,.rtt-inline.rtt-theme-system .rtt-window{background:#293a58!important;color:#e3ebfa!important;border-color:#3a4d70!important}}';
      style.textContent +=
        '.rtt-time-editor{display:inline-flex;align-items:center;gap:3px;color:var(--rtt-accent);font-variant-numeric:tabular-nums;font-weight:800}.rtt-duration-input{width:28px;border:1px solid color-mix(in srgb,var(--rtt-accent) 36%,#ccd8e8);border-radius:6px;padding:5px 2px;background:#fff;color:#17233e;font:800 13px/1 system-ui,sans-serif;text-align:center}.rtt-duration-input:focus{outline:2px solid color-mix(in srgb,var(--rtt-accent) 28%,transparent);outline-offset:1px}.rtt-duration-save,.rtt-duration-cancel{min-width:24px!important;padding:6px 5px!important;font-size:12px!important;line-height:1!important}.rtt-duration-save{background:var(--rtt-accent)!important}.rtt-duration-cancel{background:#e9eef7!important;color:#30415f!important}.rtt-duration-error{flex-basis:100%;color:#a33137;font-size:10px;font-weight:700}.rtt-theme-dark .rtt-duration-input{border-color:#3a4d70;background:#101a2c;color:#e8effb}.rtt-theme-dark .rtt-duration-cancel{background:#293a58!important;color:#e3ebfa!important}';
      shadow.append(style);
      const mountPoint = document.createElement('div');
      shadow.append(mountPoint);

      if (target?.parentElement)
        target.parentElement.insertBefore(host, target.nextSibling);
      else content?.insertBefore(host, content.firstChild);

      const root: Root = createRoot(mountPoint);
      root.render(<InlineControl issueId={issueId} />);
    };
    mount();
    const observer = new MutationObserver(() => mount());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 60_000);
  },
});
