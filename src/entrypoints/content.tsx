/// <reference path="../../.wxt/types/imports-module.d.ts" />
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Play, CircleStop, Pause, Send } from 'lucide-react';
import { defineContentScript } from '#imports';
import { getDisplayedDuration } from '@/domain/timer';
import type { TimeSession } from '@/domain/types';
import { defaultPreferences, type Preferences } from '@/domain/preferences';

const HOST_ID = 'redmine-time-tracker-control';
const issueIdFromLocation = () => { const match = location.pathname.match(/^\/issues\/(\d+)/); return match ? Number(match[1]) : null; };

type RuntimeMessage = {
  type: string;
  [key: string]: unknown;
};

function sendRuntimeMessage<T = unknown>(message: RuntimeMessage, callback?: (result: T | undefined) => void) {
  try {
    if (!chrome.runtime?.id) return false;

    chrome.runtime.sendMessage(message, (result: T) => {
      // A extensão pode ser recarregada enquanto a página continua aberta.
      // Nesse caso o callback antigo pode receber lastError ou nem ser concluído.
      if (chrome.runtime.lastError) return;
      callback?.(result);
    });
    return true;
  } catch {
    // O contexto antigo do content script foi invalidado. A página será
    // atualizada naturalmente quando o usuário recarregar a extensão/página.
    return false;
  }
}

function InlineControl({ issueId }: { issueId: number }) {
  const [snapshot, setSnapshot] = useState<{ active?: { issueId: number; status: string }; seconds: number; preferences: Pick<Preferences, 'accentColor' | 'widgetStyle'> }>({ seconds: 0, preferences: defaultPreferences });
  useEffect(() => {
    let contextValid = true;
    const refresh = () => {
      if (!contextValid) return;
      const sent = sendRuntimeMessage<{ ok: boolean; state?: { sessions: TimeSession[]; preferences: Preferences } }>({ type: 'GET_STATE' }, (result) => {
        if (!result?.ok || !result.state) return;
        const active = result.state.sessions.find((session) => session.status === 'running' || session.status === 'paused');
        setSnapshot({ active, seconds: active ? getDisplayedDuration(active, new Date().toISOString()) : 0, preferences: result.state.preferences });
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
  const accentColors: Record<Preferences['accentColor'], string> = { blue: '#2e5bd7', indigo: '#5b4bd8', green: '#168b68', violet: '#8a4fd1', orange: '#d77725' };
  const widgetStyle = snapshot.preferences.widgetStyle ?? defaultPreferences.widgetStyle;
  const inlineStyle = { '--rtt-accent': accentColors[snapshot.preferences.accentColor] ?? accentColors.blue } as CSSProperties;
  return <div className={`rtt-inline rtt-${widgetStyle}`} style={inlineStyle}><span className="rtt-time">{new Date(snapshot.seconds * 1000).toISOString().slice(11, 19)}</span>{runningOnThisIssue ? <><button className="rtt-pause" title="Pausar timer" onClick={() => act({ type: 'PAUSE_SESSION' })}><Pause size={14} /> Pausar</button><button className="rtt-stop" title="Parar timer" onClick={() => act({ type: 'STOP_SESSION' })}><CircleStop size={14} /> Parar</button></> : pausedOnThisIssue ? <><button className="rtt-resume" title="Retomar timer" onClick={() => act({ type: 'RESUME_SESSION' })}><Play size={14} /> Retomar</button><button className="rtt-stop" title="Parar timer" onClick={() => act({ type: 'STOP_SESSION' })}><CircleStop size={14} /> Parar</button></> : <button className="rtt-start" title="Iniciar timer" onClick={() => act({ type: 'START_SESSION', issueId, projectId: 0 })}><Play size={14} /> Iniciar</button>}<button className="rtt-launch" title="Abrir lançamentos" onClick={() => act({ type: 'OPEN_WINDOW' })}><Send size={14} /> Lançar</button></div>;
}

export default defineContentScript({ registration: 'runtime', matches: [], runAt: 'document_idle', main() {
  const mount = () => {
    const issueId = issueIdFromLocation();
    if (!issueId || document.getElementById(HOST_ID)) return;

    const target = document.querySelector('#content h2, #content .subject, .subject h3, h2');
    const content = document.querySelector('#content');
    if (!target?.parentElement && !content) return;

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all: initial; display: block; margin: 8px 0;';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = '.rtt-inline{--rtt-accent:#2e5bd7;display:inline-flex;align-items:center;flex-wrap:wrap;gap:7px;border:1px solid #d6deec;border-radius:12px;padding:7px 9px;background:linear-gradient(135deg,#fff 0%,#f4f7fc 100%);box-shadow:0 5px 16px rgba(26,39,64,.14);font:13px/1.2 system-ui,sans-serif}.rtt-inline.rtt-minimal{border-color:transparent;padding:4px 0;background:transparent;box-shadow:none}.rtt-inline.rtt-prominent{border-color:var(--rtt-accent);background:linear-gradient(135deg,#fff 0%,color-mix(in srgb,var(--rtt-accent) 8%,#fff) 100%);box-shadow:0 6px 18px color-mix(in srgb,var(--rtt-accent) 24%,transparent)}.rtt-inline button{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:0;border-radius:8px;padding:7px 10px;color:#fff;font:700 12px/1 system-ui,sans-serif;cursor:pointer;transition:filter .15s ease,transform .15s ease}.rtt-inline button:hover{filter:brightness(.94);transform:translateY(-1px)}.rtt-start,.rtt-resume{background:var(--rtt-accent)}.rtt-pause{background:#d89a22;box-shadow:0 3px 8px rgba(216,154,34,.24)}.rtt-stop{background:#d84d5b;box-shadow:0 3px 8px rgba(216,77,91,.24)}.rtt-launch{background:#e9eef7;color:#30415f!important;border:1px solid #d1dbea!important}.rtt-time{min-width:67px;color:var(--rtt-accent);font-variant-numeric:tabular-nums;font-weight:800;text-align:center;letter-spacing:.02em}';
    shadow.append(style);
    const mountPoint = document.createElement('div');
    shadow.append(mountPoint);

    if (target?.parentElement) target.parentElement.insertBefore(host, target.nextSibling);
    else content?.insertBefore(host, content.firstChild);

    const root: Root = createRoot(mountPoint);
    root.render(<InlineControl issueId={issueId} />);
  };
  mount(); const observer = new MutationObserver(() => mount()); observer.observe(document.body, { childList: true, subtree: true }); window.setTimeout(() => observer.disconnect(), 60_000);
}});
