/// <reference path="../../.wxt/types/imports-module.d.ts" />
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Play, CircleStop, Pause, Send } from 'lucide-react';
import { defineContentScript } from '#imports';
import { getIssueDisplayedDuration } from '@/domain/timer';
import type { TimeSession } from '@/domain/types';
import { defaultPreferences, getSuggestedEntryHours, type Preferences } from '@/domain/preferences';

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

function requestRuntimeMessage<T>(message: RuntimeMessage): Promise<T | undefined> {
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
    preferences: Pick<Preferences, 'accentColor' | 'widgetStyle' | 'roundToInterval'>;
  }>({ seconds: 0, preferences: defaultPreferences });
  const [launchForm, setLaunchForm] = useState<LaunchForm | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState('');
  useEffect(() => {
    let contextValid = true;
    const refresh = () => {
      if (!contextValid) return;
      const sent = sendRuntimeMessage<{
        ok: boolean;
        state?: { sessions: TimeSession[]; preferences: Preferences };
      }>({ type: 'GET_STATE' }, (result) => {
        if (!result?.ok || !result.state) return;
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
      setLaunchError(stopped?.error ?? 'Não foi possível parar o timer.');
      setLaunchBusy(false);
      return;
    }

    const activityResponse = await requestRuntimeMessage<{
      ok: boolean;
      error?: string;
      activities?: Activity[];
    }>({ type: 'GET_ACTIVITIES' });
    const activities = activityResponse?.ok ? activityResponse.activities ?? [] : [];
    setLaunchForm({
      session: stopped.session,
      activities,
      hours: getSuggestedEntryHours(stopped.session.durationSeconds, snapshot.preferences.roundToInterval).toFixed(2),
      activityId: activities[0]?.id.toString() ?? '',
      comments: stopped.session.description,
    });
    if (!activityResponse?.ok) setLaunchError(activityResponse?.error ?? 'Não foi possível carregar as atividades.');
    setLaunchBusy(false);
  };
  const submitLaunch = async () => {
    if (!launchForm) return;
    const hours = Number(launchForm.hours.replace(',', '.'));
    if (!launchForm.activityId || !Number.isFinite(hours) || hours <= 0) {
      setLaunchError('Informe uma duração válida e selecione uma atividade.');
      return;
    }
    setLaunchBusy(true);
    setLaunchError('');
    const result = await requestRuntimeMessage<{ ok: boolean; error?: string }>({
      type: 'SUBMIT_SESSION',
      sessionId: launchForm.session.id,
      activityId: Number(launchForm.activityId),
      comments: launchForm.comments,
      spentOn: launchForm.session.spentOn,
      hours,
    });
    if (!result?.ok) setLaunchError(result?.error ?? 'Não foi possível registrar as horas.');
    else setLaunchForm(null);
    setLaunchBusy(false);
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
  return (
    <div className={`rtt-inline rtt-${widgetStyle}`} style={inlineStyle}>
      <span className="rtt-time">
        {new Date(snapshot.seconds * 1000).toISOString().slice(11, 19)}
      </span>
      {runningOnThisIssue ? (
        <>
          <button
            className="rtt-pause"
            title="Pausar timer"
            onClick={() => act({ type: 'PAUSE_SESSION' })}
          >
            <Pause size={14} /> Pausar
          </button>
          <button
            className="rtt-stop"
            title="Parar timer"
            onClick={() => act({ type: 'STOP_SESSION' })}
          >
            <CircleStop size={14} /> Parar
          </button>
        </>
      ) : pausedOnThisIssue ? (
        <>
          <button
            className="rtt-resume"
            title="Retomar timer"
            onClick={() => act({ type: 'RESUME_SESSION' })}
          >
            <Play size={14} /> Retomar
          </button>
          <button
            className="rtt-stop"
            title="Parar timer"
            onClick={() => act({ type: 'STOP_SESSION' })}
          >
            <CircleStop size={14} /> Parar
          </button>
        </>
      ) : (
        <button
          className="rtt-start"
          title="Iniciar timer"
          onClick={() => act({ type: 'START_SESSION', issueId, projectId: 0 })}
        >
          <Play size={14} /> Iniciar
        </button>
      )}
      <button
        className="rtt-launch"
        title={
          runningOnThisIssue || pausedOnThisIssue
            ? 'Parar e abrir lançamento'
            : 'Abrir lançamentos'
        }
        onClick={() => void openLaunch()}
      >
        <Send size={14} /> Lançar
      </button>
      {launchForm && (
        <div className="rtt-modal-backdrop" role="presentation">
          <div className="rtt-modal" role="dialog" aria-modal="true" aria-labelledby="rtt-launch-title">
            <div className="rtt-modal-header">
              <strong id="rtt-launch-title">Lançar horas · #{launchForm.session.issueId}</strong>
              <button className="rtt-modal-close" aria-label="Fechar" onClick={() => setLaunchForm(null)}>×</button>
            </div>
            <div className="rtt-modal-duration">Sessão encerrada: <strong>{new Date(launchForm.session.durationSeconds * 1000).toISOString().slice(11, 19)}</strong></div>
            {launchError && <div className="rtt-modal-error">{launchError}</div>}
            <label className="rtt-modal-label">Horas
              <input className="rtt-modal-input" type="text" inputMode="decimal" value={launchForm.hours} onChange={(event) => setLaunchForm((current) => current ? { ...current, hours: event.target.value } : current)} />
            </label>
            <label className="rtt-modal-label">Atividade
              <select className="rtt-modal-input" value={launchForm.activityId} onChange={(event) => setLaunchForm((current) => current ? { ...current, activityId: event.target.value } : current)}>
                <option value="">Selecione uma atividade</option>
                {launchForm.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}
              </select>
            </label>
            <label className="rtt-modal-label">Descrição
              <textarea className="rtt-modal-input" rows={3} value={launchForm.comments} onChange={(event) => setLaunchForm((current) => current ? { ...current, comments: event.target.value } : current)} placeholder="Descrição do trabalho" />
            </label>
            <div className="rtt-modal-actions">
              <button className="rtt-modal-secondary" onClick={() => setLaunchForm(null)}>Depois</button>
              <button className="rtt-modal-primary" disabled={launchBusy || !launchForm.activityId} onClick={() => void submitLaunch()}>{launchBusy ? 'Registrando…' : 'Registrar horas'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
        '.rtt-inline{--rtt-accent:#2e5bd7;display:inline-flex;align-items:center;flex-wrap:wrap;gap:7px;border:1px solid #d6deec;border-radius:12px;padding:7px 9px;background:linear-gradient(135deg,#fff 0%,#f4f7fc 100%);box-shadow:0 5px 16px rgba(26,39,64,.14);font:13px/1.2 system-ui,sans-serif}.rtt-inline.rtt-minimal{border-color:transparent;padding:4px 0;background:transparent;box-shadow:none}.rtt-inline.rtt-prominent{border-color:var(--rtt-accent);background:linear-gradient(135deg,#fff 0%,color-mix(in srgb,var(--rtt-accent) 8%,#fff) 100%);box-shadow:0 6px 18px color-mix(in srgb,var(--rtt-accent) 24%,transparent)}.rtt-inline button{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:8px;padding:7px 10px;color:#fff;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:filter .15s ease,transform .15s ease}.rtt-inline button:hover{filter:brightness(.94);transform:translateY(-1px)}.rtt-start,.rtt-resume{background:var(--rtt-accent)}.rtt-pause{background:#d89a22;box-shadow:0 3px 8px rgba(216,154,34,.24)}.rtt-stop{background:#d84d5b;box-shadow:0 3px 8px rgba(216,77,91,.24)}.rtt-launch{background:#e9eef7;color:#30415f!important;border:1px solid #d1dbea!important}.rtt-time{min-width:67px;color:var(--rtt-accent);font-variant-numeric:tabular-nums;font-weight:800;text-align:center;letter-spacing:.02em}';
      style.textContent +=
        '.rtt-modal-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.42);font:13px/1.35 system-ui,sans-serif}.rtt-modal{width:min(360px,calc(100vw - 32px));border:1px solid #d6deec;border-radius:16px;padding:16px;background:#fff;color:#17233e;box-shadow:0 20px 60px rgba(15,23,42,.28)}.rtt-modal-header,.rtt-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.rtt-modal-header{margin-bottom:12px}.rtt-modal-close{border:0;background:transparent;color:#71809a;font-size:24px;line-height:1;cursor:pointer}.rtt-modal-duration{margin-bottom:12px;border-radius:9px;padding:9px 10px;background:#f2f6fb;color:#5d6d88}.rtt-modal-label{display:grid;gap:5px;margin-top:10px;color:#344563;font-weight:700}.rtt-modal-input{width:100%;border:1px solid #ccd8e8;border-radius:9px;padding:9px 10px;background:#fff;color:#17233e;font:inherit;box-sizing:border-box}.rtt-modal-error{margin:8px 0;border:1px solid #f1c9ca;border-radius:9px;padding:8px 10px;background:#fff5f5;color:#a33137}.rtt-modal-actions{justify-content:flex-end;margin-top:14px}.rtt-modal-primary,.rtt-modal-secondary{border:0;border-radius:9px;padding:9px 12px;font:700 12px system-ui,sans-serif;cursor:pointer}.rtt-modal-primary{background:var(--rtt-accent);color:#fff}.rtt-modal-primary:disabled{cursor:not-allowed;opacity:.5}.rtt-modal-secondary{background:#eaf0f8;color:#30415f}';
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
