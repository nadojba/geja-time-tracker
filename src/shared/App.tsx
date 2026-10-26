import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clock3,
  ExternalLink,
  ListTodo,
  Settings2,
  TimerReset,
  Play,
  Pause,
  Square,
  Send,
  RefreshCw,
  PanelTop,
  FileDown,
  PanelRight,
  PanelRightClose,
  BarChart3,
  Download,
  Upload,
  Stethoscope,
  Kanban,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  defaultPreferences,
  getSuggestedEntryHours,
  shouldConfirmIssueSwitch,
  type Preferences,
} from '@/domain/preferences';
import type {
  RedmineIssue,
  RedmineActivity,
  RedmineProject,
  RedmineTimeEntry,
} from '@/services/redmine/client';
import {
  filterIssues,
  groupIssues,
  sortIssues,
} from '@/domain/issue-filters';
import type { ExtensionState } from '@/services/storage/repository';
import type {
  RuntimeMessage,
  RuntimeResponse,
} from '@/services/messaging/protocol';
import '@/styles/app.css';
import { printTimeReport } from '@/utils/time-report';
import {
  dailyReportSeries,
  summarizeReport,
  type ReportPeriod,
} from '@/domain/reports';
import { createLocalBackup } from '@/domain/backup';
import { downloadTimeReportCsv } from '@/utils/time-report-csv';
import { ensureBoardCards, moveBoardCard, type BoardState } from '@/domain/board';
import { parseDescriptionInline, parseRedmineDescription } from '@/utils/redmine-description';
import {
  isInsecureRedmineUrl,
  normalizeRedmineUrl,
  redmineIssueUrl,
  redmineOriginPattern,
} from '@/services/permissions/host';
import { changelog, getLanguage, setLanguage, translate as t, translateError } from '@/i18n';

type Tab = 'timer' | 'issues' | 'hours' | 'reports' | 'board' | 'settings';
const initialTab = (): Tab => {
  const requested = new URLSearchParams(location.search).get('tab');
  return requested === 'hours' ||
    requested === 'issues' ||
    requested === 'reports' ||
    requested === 'board' ||
    requested === 'settings'
    ? requested
    : 'timer';
};
const localDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const timerWindowMode =
  new URLSearchParams(location.search).get('mode') === 'timer-window';
const boardWindowMode =
  new URLSearchParams(location.search).get('mode') === 'board-window';
const sidePanelMode = location.pathname.endsWith('sidepanel.html');
const createIssueSchema = z.object({
  projectId: z.string().min(1, 'Selecione um projeto.'),
  subject: z.string().trim().min(1, 'Informe o assunto do chamado.').max(255, 'O assunto deve ter no máximo 255 caracteres.'),
  description: z.string().max(10_000, 'A descrição deve ter no máximo 10.000 caracteres.'),
  trackerId: z.string().optional(),
  statusId: z.string().optional(),
  priorityId: z.string().optional(),
});
type CreateIssueForm = z.infer<typeof createIssueSchema>;
const send = (message: RuntimeMessage) =>
  new Promise<RuntimeResponse>((resolve) => {
    let settled = false;
    const finish = (response: RuntimeResponse) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(response);
    };
    const timeoutId = window.setTimeout(() => {
      finish({
        ok: false,
        error: 'O Redmine ou o service worker não respondeu. Verifique a conexão e tente novamente; a sessão foi preservada.',
      });
    }, 20_000);
    try {
      chrome.runtime.sendMessage(message, (response?: RuntimeResponse) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          finish({ ok: false, error: runtimeError.message ?? 'Falha ao comunicar com o service worker.' });
          return;
        }
        finish(response ? (response.ok ? response : { ...response, error: translateError(response.error) }) : { ok: false, error: t('noResponse') });
      });
    } catch (error) {
      finish({ ok: false, error: error instanceof Error ? translateError(error.message) : translateError('Não foi possível comunicar com a extensão.') });
    }
  });
const formatSeconds = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [state, setState] = useState<ExtensionState | null>(null);
  const [issues, setIssues] = useState<RedmineIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [activities, setActivities] = useState<RedmineActivity[]>([]);
  const [timeEntries, setTimeEntries] = useState<RedmineTimeEntry[]>([]);
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);
  const [activeIssue, setActiveIssue] = useState<RedmineIssue | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState('');
  const [issueScope, setIssueScope] = useState<'assigned' | 'all'>('assigned');
  setLanguage(state?.preferences.language ?? 'pt-BR');

  useEffect(() => {
    const rootClass = timerWindowMode
      ? 'timer-window-root'
      : boardWindowMode
        ? 'board-window-root'
      : sidePanelMode
        ? 'side-panel-root'
        : null;
    if (!rootClass) return;
    document.documentElement.classList.add(rootClass);
    return () => document.documentElement.classList.remove(rootClass);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state?.preferences.theme ?? 'system';
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [state?.preferences.theme]);

  const refresh = async () => {
    const result = await send({ type: 'GET_STATE' });
    if (result.ok) setState(result.state);
    else setError(result.error);
  };
  const openSidePanel = async () => {
    setError('');
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (!currentWindow.id) {
        throw new Error('Não foi possível identificar a janela atual do Chrome.');
      }
      // O Chrome exige que sidePanel.open seja chamado diretamente em uma
      // ação do usuário; por isso esta operação não passa pelo service worker.
      await chrome.sidePanel.open({ windowId: currentWindow.id });
    } catch (openError) {
      setError(
        openError instanceof Error
          ? `Não foi possível abrir o painel lateral. ${openError.message}`
          : 'Não foi possível abrir o painel lateral neste Chrome.',
      );
    }
  };
  const closeSidePanel = async () => {
    setError('');
    try {
      if (!chrome.sidePanel?.close) {
        throw new Error(
          'Seu Chrome ainda não oferece o comando para fechar o painel pela extensão.',
        );
      }
      const currentWindow = await chrome.windows.getCurrent();
      if (!currentWindow.id) {
        throw new Error('Não foi possível identificar a janela atual do Chrome.');
      }
      await chrome.sidePanel.close({ windowId: currentWindow.id });
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : 'Não foi possível fechar o painel lateral.',
      );
    }
  };
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const listener = () => void refresh();
    chrome.storage?.onChanged.addListener(listener);
    return () => {
      window.clearInterval(interval);
      chrome.storage?.onChanged.removeListener(listener);
    };
  }, []);
  const loadIssues = async () => {
    if ((tab !== 'issues' && tab !== 'board') || !state?.account) return;
    setIssuesLoading(true);
    setError('');
    try {
      const requestedScope = tab === 'board' ? 'assigned' : issueScope;
      const issuesResult = await send({ type: 'GET_ISSUES', scope: requestedScope });
      if (!issuesResult.ok) {
        setError(issuesResult.error);
        return;
      }
      let loadedIssues = (issuesResult.issues ?? []) as RedmineIssue[];
      if (tab === 'board' && requestedScope === 'assigned' && loadedIssues.length === 0) {
        const fallbackResult = await send({ type: 'GET_ISSUES', scope: 'all' });
        if (fallbackResult.ok && fallbackResult.issues?.length)
          loadedIssues = fallbackResult.issues as RedmineIssue[];
      }
      setIssues(loadedIssues);
    } finally {
      setIssuesLoading(false);
    }
  };
  useEffect(() => {
    if ((tab !== 'issues' && tab !== 'board') || !state?.account) {
      if (!state?.account) setIssues([]);
      return;
    }
    void loadIssues();
  }, [tab, state?.account, issueScope]);
  useEffect(() => {
    if (tab !== 'hours' || !state?.account || activities.length) return;
    void send({ type: 'GET_ACTIVITIES' }).then((result) => {
      if (result.ok)
        setActivities((result.activities ?? []) as RedmineActivity[]);
    });
  }, [tab, state?.account, activities.length]);
  useEffect(() => {
    if ((tab !== 'hours' && tab !== 'reports') || !state?.account) {
      if (!state?.account) {
        setTimeEntries([]);
        setTimeEntriesLoading(false);
      }
      return;
    }
    setTimeEntriesLoading(true);
    void send({ type: 'GET_TIME_ENTRIES' }).then((result) => {
      if (result.ok) setTimeEntries((result.timeEntries ?? []) as RedmineTimeEntry[]);
      else setError(result.error);
    }).finally(() => setTimeEntriesLoading(false));
  }, [tab, state?.account]);
  const active = state?.sessions.find(
    (session) => session.status === 'running' || session.status === 'paused',
  );
  const activeSeconds = active
    ? active.durationSeconds +
      (active.status === 'running'
        ? Math.max(
            0,
            Math.floor(
              (now -
                Date.parse(
                  active.segments.at(-1)?.startedAt ?? active.startedAt,
                )) /
                1000,
            ),
          )
        : 0)
    : 0;
  const pending =
    state?.sessions.filter(
      (session) =>
        session.status === 'pending' ||
        session.status === 'reconciliation_required',
    ) ?? [];
  useEffect(() => {
    if (
      (!timerWindowMode && !sidePanelMode) ||
      !active?.issueId ||
      !state?.account
    ) {
      setActiveIssue(null);
      return;
    }
    void send({ type: 'GET_ISSUE', issueId: active.issueId }).then((result) => {
      if (result.ok) setActiveIssue((result.issue ?? null) as RedmineIssue | null);
      else setError(result.error);
    });
  }, [state?.account, active?.issueId]);
  const run = async (messageToSend: RuntimeMessage) => {
    setError('');
    if (
      messageToSend.type === 'STOP_SESSION' &&
      active &&
      activeSeconds > 0 &&
      !window.confirm(
        `O timer do chamado #${active.issueId} tem ${formatSeconds(activeSeconds)}. Deseja realmente parar e salvar esta sessão?`,
      )
    )
      return;
    if (
      messageToSend.type === 'START_SESSION' &&
      state?.preferences.autoPause &&
      shouldConfirmIssueSwitch(
        active?.issueId,
        messageToSend.issueId,
        state?.preferences ?? defaultPreferences,
      ) &&
      !window.confirm(
        `Já existe um timer ativo no chamado #${active?.issueId}. Deseja encerrá-lo e iniciar o chamado #${messageToSend.issueId}?`,
      )
    )
      return;
    const result = await send(messageToSend);
    if (result.ok) {
      setState(result.state);
      if (
        messageToSend.type === 'STOP_SESSION' &&
        result.state.preferences.stopTimerBehavior === 'save-and-open'
      ) {
        setTab('hours');
      }
      setMessage('Estado atualizado.');
    } else setError(result.error);
  };

  if (!state)
    return (
      <main className="app">
        <div className="card">{t('loading')} {t('appName')}</div>
      </main>
    );
  return (
    <main
      className={`app theme-${state.preferences.theme} accent-${state.preferences.accentColor}${timerWindowMode ? ' timer-window' : ''}${boardWindowMode ? ' board-window' : ''}${sidePanelMode ? ' side-panel' : ''}`}
    >
      <header className="row">
        <div className="brand">
          <img src="/icons/redmine-logo.svg" alt="" className="brand-logo" />
          <div>
            <div className="title">{t('appName')}</div>
            <div className="muted">
              {state.account
                ? `Conectado como ${state.account.user.name}`
                : t('configureAccount')}
            </div>
          </div>
        </div>
        <div className="row header-actions">
          {!sidePanelMode && !boardWindowMode && (
            <button
              className="button secondary"
              title={t('panel')}
              onClick={() => void openSidePanel()}
            >
              <PanelRight size={15} /> {t('panel')}
            </button>
          )}
          {sidePanelMode && (
            <button
              className="button secondary"
              title={t('minimizePanel')}
              aria-label="Minimizar painel lateral"
              onClick={() => void closeSidePanel()}
            >
              <PanelRightClose size={15} />
            </button>
          )}
          {!timerWindowMode && !boardWindowMode && (
            <button className="button secondary icon-button" title={t('board')} aria-label={t('board')} onClick={() => void send({ type: 'OPEN_BOARD_WINDOW' } as RuntimeMessage)}>
              <Kanban size={15} />
            </button>
          )}
          {!timerWindowMode && !boardWindowMode && (
            <button
              className={`button secondary icon-button ${tab === 'settings' ? 'active' : ''}`}
              title={t('settings')}
              aria-label={t('settings')}
              onClick={() => setTab('settings')}
            >
              <Settings2 size={15} />
            </button>
          )}
          {!sidePanelMode && !boardWindowMode && (
            <button
              className="button secondary"
              title="Abrir em uma janela separada"
              onClick={() => void send({ type: 'OPEN_TIMER_WINDOW' })}
            >
              <PanelTop size={15} /> {t('window')}
            </button>
          )}
          <button
            className="button secondary"
            title={t('refresh')}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>
      {!timerWindowMode && !boardWindowMode && (
        <nav className="tabs">
          {(
            [
              ['timer', <Clock3 size={14} />, t('timer')],
              ['issues', <ListTodo size={14} />, t('issues')],
              ['hours', <TimerReset size={14} />, t('hours')],
              ['reports', <BarChart3 size={14} />, t('reports')],
            ] as const
          ).map(([value, icon, label]) => (
            <button
              className={`tab ${tab === value ? 'active' : ''}`}
              key={value}
              onClick={() => setTab(value)}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      )}
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      {(timerWindowMode || tab === 'timer') && (
        <TimerTab
          active={active}
          activeIssue={activeIssue}
          redmineUrl={state.account?.redmineUrl ?? ''}
          activeSeconds={activeSeconds}
          pending={pending.length}
          showTimerSessions={state.preferences.showTimerSessions}
          onError={setError}
          onAction={run}
        />
      )}
      {!timerWindowMode && tab === 'issues' && (
        <IssuesTab
          issues={issues}
          search={search}
          setSearch={setSearch}
          issueScope={issueScope}
          setIssueScope={setIssueScope}
          activeId={active?.issueId}
          redmineUrl={state.account?.redmineUrl ?? ''}
          preferences={state.preferences}
          trackedIssueIds={new Set(state.sessions.map((session) => session.issueId))}
          pendingIssueIds={new Set(state.sessions.filter((session) => session.accountId === state.account?.accountId && (session.status === 'pending' || session.status === 'reconciliation_required')).map((session) => session.issueId))}
          workedTodayIssueIds={new Set(state.sessions.filter((session) => session.accountId === state.account?.accountId && session.spentOn === localDateInputValue(new Date())).map((session) => session.issueId))}
          onAction={run}
          onCreateIssue={() => setCreateIssueOpen(true)}
        />
      )}
      {!timerWindowMode && tab === 'hours' && (
        <HoursTab
          sessions={state.sessions}
          accountId={state.account?.accountId}
          activities={activities}
          timeEntries={timeEntries}
          preferences={state.preferences}
          onAction={run}
          onGenerateReport={() => {
            try {
              const accountSessions = state.account
                ? state.sessions.filter(
                    (session) => session.accountId === state.account?.accountId,
                  )
                : [];
              printTimeReport({
                sessions: accountSessions,
                serverEntries: timeEntries,
                accountName: state.account?.user.name,
                redmineUrl: state.account?.redmineUrl,
              });
              setMessage(t('reportOpened'));
            } catch (reportError) {
              setError(
                reportError instanceof Error
                  ? reportError.message
                  : translateError('Não foi possível gerar o relatório.'),
              );
            }
          }}
        />
      )}
      {!timerWindowMode && tab === 'reports' && (
        <ReportsTab
          sessions={state.sessions}
          accountId={state.account?.accountId}
          serverEntries={timeEntries}
          loading={timeEntriesLoading}
          onGenerateReport={() => {
            try {
              const accountSessions = state.account
                ? state.sessions.filter((session) => session.accountId === state.account?.accountId)
                : [];
              printTimeReport({
                sessions: accountSessions,
                serverEntries: timeEntries,
                accountName: state.account?.user.name,
                redmineUrl: state.account?.redmineUrl,
              });
              setMessage(t('reportOpened'));
            } catch (reportError) {
              setError(reportError instanceof Error ? translateError(reportError.message) : translateError('Não foi possível gerar o relatório.'));
            }
          }}
        />
      )}
      {(boardWindowMode || tab === 'board') && (
        <BoardTab
          issues={issues}
          issuesLoading={issuesLoading}
          board={state.board}
          redmineUrl={state.account?.redmineUrl ?? ''}
          sessions={state.sessions}
          active={active}
          activeSeconds={activeSeconds}
          onSave={async (board) => {
            const result = await send({ type: 'SAVE_BOARD', board });
            if (result.ok) setState(result.state);
            else setError(result.error);
          }}
          onAction={run}
          onRefreshIssues={() => void loadIssues()}
        />
      )}
      {!timerWindowMode && tab === 'settings' && (
        <SettingsTab
          state={state}
          onConnected={(next) => {
            setState(next);
            setMessage(t('connectionValidated'));
          }}
          onSave={async (url, apiKey, preferences) => {
            const config = await send({ type: 'SAVE_CONFIG', url, apiKey });
            if (!config.ok) {
              setError(config.error);
              return false;
            }
            const saved = await send({ type: 'SAVE_PREFERENCES', preferences });
            if (!saved.ok) {
              setError(saved.error);
              return false;
            }
            setState(saved.state);
            setMessage(t('changesSaved'));
            return true;
          }}
          onOpenChangelog={() => setChangelogOpen(true)}
          onLanguageChange={async (language) => {
            const preferences = {
              ...state.preferences,
              language,
            };
            setState((current) => current ? {
              ...current,
              preferences,
            } : current);

            const saved = await send({ type: 'SAVE_PREFERENCES', preferences });
            if (!saved.ok) {
              setError(saved.error);
              return;
            }
            setState(saved.state);
          }}
        />
      )}
      {createIssueOpen && state.account && (
        <CreateIssueModal
          issues={issues}
          onClose={() => setCreateIssueOpen(false)}
          onCreated={async (createdIssue) => {
            setCreateIssueOpen(false);
            setMessage(`Chamado #${createdIssue.id} criado com sucesso.`);
            await loadIssues();
          }}
        />
      )}
      {changelogOpen && <ChangelogModal onClose={() => setChangelogOpen(false)} />}
    </main>
  );
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  const language = getLanguage();
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal changelog-modal" role="dialog" aria-modal="true" aria-labelledby="changelog-title" onClick={(event) => event.stopPropagation()}>
        <div className="row modal-heading">
          <div>
            <div className="changelog-title" id="changelog-title"><span className="changelog-title-icon"><Sparkles size={16} /></span><span>{t('whatsNew')}</span></div>
            <div className="muted">{t('whatsNewDescription')}</div>
          </div>
          <button className="icon-button board-modal-close" aria-label={t('close')} title={t('close')} onClick={onClose}><X size={20} strokeWidth={2.5} /></button>
        </div>
        <div className="stack changelog-list">
          {changelog.length ? changelog.map((entry) => (
            <article className="changelog-entry" key={entry.version}>
              <div className="changelog-entry-header"><span className="changelog-version">{t('version')} {entry.version}</span><time>{entry.date}</time></div>
              <ul>{entry.changes[language].map((change) => <li key={change}>{change}</li>)}</ul>
            </article>
          )) : <div className="muted">{t('noChangelog')}</div>}
        </div>
      </div>
    </div>
  );
}

function CreateIssueModal({
  issues,
  onClose,
  onCreated,
}: {
  issues: RedmineIssue[];
  onClose: () => void;
  onCreated: (issue: RedmineIssue) => Promise<void>;
}) {
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateIssueForm>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      projectId: '',
      subject: '',
      description: '',
      trackerId: '',
      statusId: '',
      priorityId: '',
    },
  });
  const trackerOptions = useMemo(
    () => [...new Map(issues.flatMap((issue) => issue.tracker ? [[issue.tracker.id, issue.tracker.name]] : []))],
    [issues],
  );
  const statusOptions = useMemo(
    () => [...new Map(issues.flatMap((issue) => issue.status ? [[issue.status.id, issue.status.name]] : []))],
    [issues],
  );
  const priorityOptions = useMemo(
    () => [...new Map(issues.flatMap((issue) => issue.priority ? [[issue.priority.id, issue.priority.name]] : []))],
    [issues],
  );

  useEffect(() => {
    let mounted = true;
    void send({ type: 'GET_PROJECTS' }).then((result) => {
      if (!mounted) return;
      if (result.ok) setProjects((result.projects ?? []) as RedmineProject[]);
      else setProjectsError(result.error);
      setProjectsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (form: CreateIssueForm) => {
    setSubmitError('');
    const result = await send({
      type: 'CREATE_ISSUE',
      projectId: Number(form.projectId),
      subject: form.subject,
      description: form.description,
      trackerId: form.trackerId ? Number(form.trackerId) : undefined,
      statusId: form.statusId ? Number(form.statusId) : undefined,
      priorityId: form.priorityId ? Number(form.priorityId) : undefined,
    });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    await onCreated(result.createdIssue as RedmineIssue);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => { if (!isSubmitting) onClose(); }}>
      <div className="modal create-issue-modal" role="dialog" aria-modal="true" aria-labelledby="create-issue-title" onClick={(event) => event.stopPropagation()}>
        <div className="row modal-heading">
          <div>
            <div className="title" id="create-issue-title">{t('newIssue')}</div>
            <div className="muted">{t('issueDescription')}</div>
          </div>
          <button className="icon-button board-modal-close" aria-label="Fechar cadastro de chamado" title="Fechar" disabled={isSubmitting} onClick={onClose}>
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <form className="stack create-issue-form" onSubmit={(event) => void handleSubmit(submit)(event)}>
          <label className="field">
            <span>{t('project')} <strong>*</strong></span>
            <select {...register('projectId')} disabled={projectsLoading || isSubmitting}>
              <option value="">{projectsLoading ? t('loading') : `${t('project')}…`}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            {projectsError && <small className="error-text">{projectsError}</small>}
            {errors.projectId && <small className="error-text">{errors.projectId.message}</small>}
          </label>
          <label className="field">
            <span>{t('subject')} <strong>*</strong></span>
            <input {...register('subject')} placeholder={t('subjectPlaceholder')} disabled={isSubmitting} autoFocus />
            {errors.subject && <small className="error-text">{errors.subject.message}</small>}
          </label>
          <label className="field">
            <span>{t('description')}</span>
            <textarea {...register('description')} rows={5} placeholder="Descreva o que precisa ser feito…" disabled={isSubmitting} />
            {errors.description && <small className="error-text">{errors.description.message}</small>}
          </label>
          {(trackerOptions.length > 0 || statusOptions.length > 0 || priorityOptions.length > 0) && (
            <div className="create-issue-options">
              {trackerOptions.length > 0 && <label className="field"><span>Tipo</span><select {...register('trackerId')} disabled={isSubmitting}><option value="">{t('defaultRedmine')}</option>{trackerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
              {statusOptions.length > 0 && <label className="field"><span>{t('status')}</span><select {...register('statusId')} disabled={isSubmitting}><option value="">{t('defaultRedmine')}</option>{statusOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
              {priorityOptions.length > 0 && <label className="field"><span>{t('priority')}</span><select {...register('priorityId')} disabled={isSubmitting}><option value="">{t('defaultRedmine')}</option>{priorityOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
            </div>
          )}
          {submitError && <div className="error">{submitError}</div>}
          <div className="row modal-actions">
            <button type="button" className="button secondary" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
            <button type="submit" className="button" disabled={isSubmitting || projectsLoading}>{isSubmitting ? t('creating') : t('createIssue')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimerTab({
  active,
  activeIssue,
  redmineUrl,
  activeSeconds,
  pending,
  showTimerSessions,
  onError,
  onAction,
}: {
  active?: ExtensionState['sessions'][number];
  activeIssue: RedmineIssue | null;
  redmineUrl: string;
  activeSeconds: number;
  pending: number;
  showTimerSessions: boolean;
  onError: (message: string) => void;
  onAction: (message: RuntimeMessage) => void;
}) {
  return (
    <section className="stack">
      <div className="card stack timer-card">
        <div className="timer-issue" title={activeIssue?.subject ?? undefined}>
          <strong>{active ? `#${active.issueId}` : t('noIssue')}</strong>
          <span>
            {active
              ? (activeIssue?.subject ?? t('loadingIssue'))
              : t('noActiveIssue')}
          </span>
          {active && redmineUrl && (
            <button
              className="timer-issue-open"
              title="Abrir chamado ativo no Redmine"
              aria-label={`Abrir chamado #${active.issueId} no Redmine`}
              onClick={() =>
                void send({ type: 'OPEN_ACTIVE_ISSUE', issueId: active.issueId }).then((result) => {
                  if (!result.ok) onError(result.error);
                })
              }
            >
              <ExternalLink size={13} />
              <span className="timer-issue-open-label">Abrir</span>
            </button>
          )}
        </div>
        <div className="timer">{formatSeconds(activeSeconds)}</div>
        <div className="row">
          {active?.status === 'paused' ? (
            <button
              className="button"
              onClick={() => onAction({ type: 'RESUME_SESSION' })}
            >
              <Play size={15} /> {t('resume')}
            </button>
          ) : active?.status === 'running' ? (
            <button
              className="button danger"
              onClick={() => onAction({ type: 'STOP_SESSION' })}
            >
              <Square size={15} /> {t('stop')}
            </button>
          ) : (
            <span className="muted">{t('chooseIssue')}</span>
          )}
          {active?.status === 'running' && (
            <button
              className="button secondary"
              onClick={() => onAction({ type: 'PAUSE_SESSION' })}
            >
              <Pause size={15} /> {t('pause')}
            </button>
          )}
          <span className="pill">{pending} {t('pending')}</span>
        </div>
      </div>
      {showTimerSessions && <div className="card">
        <div className="title">{t('recentSessions')}</div>
        {pending ? (
          <div className="muted">
            {t('closedSessionsNote')}
          </div>
        ) : (
          <div className="muted">{t('noPending')}</div>
        )}
      </div>}
    </section>
  );
}

function IssuesTab({
  issues,
  search,
  setSearch,
  issueScope,
  setIssueScope,
  activeId,
  redmineUrl,
  preferences,
  trackedIssueIds,
  pendingIssueIds,
  workedTodayIssueIds,
  onAction,
  onCreateIssue,
}: {
  issues: RedmineIssue[];
  search: string;
  setSearch: (value: string) => void;
  issueScope: 'assigned' | 'all';
  setIssueScope: (value: 'assigned' | 'all') => void;
  activeId?: number;
  redmineUrl: string;
  preferences: Preferences;
  trackedIssueIds: Set<number>;
  pendingIssueIds: Set<number>;
  workedTodayIssueIds: Set<number>;
  onAction: (message: RuntimeMessage) => void;
  onCreateIssue: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [workFilter, setWorkFilter] = useState<'all' | 'pending' | 'today'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const projectOptions = useMemo(
    () => [...new Map(issues.map((issue) => [issue.project.id, issue.project.name])).entries()],
    [issues],
  );
  const statuses = useMemo(
    () => [...new Map(issues.flatMap((issue) => issue.status ? [[issue.status.id, issue.status.name]] : [])).entries()],
    [issues],
  );
  const priorities = useMemo(
    () => [...new Map(issues.flatMap((issue) => issue.priority ? [[issue.priority.id, issue.priority.name]] : [])).entries()],
    [issues],
  );
  const groups = useMemo(() => {
    const filtered = filterIssues(issues, {
      text: search,
      projectId,
      statusId,
      priorityId,
      pendingIssueIds: workFilter === 'pending' ? pendingIssueIds : undefined,
      workedTodayIssueIds: workFilter === 'today' ? workedTodayIssueIds : undefined,
    });
    const sorted = sortIssues(filtered, {
      sortByPriority: preferences.sortIssuesByPriority,
      activeIssueId: preferences.pinActiveTabIssue ? activeId : undefined,
      pinnedIssueIds: preferences.pinTrackedIssues ? trackedIssueIds : undefined,
    });
    return groupIssues(sorted, preferences.groupIssuesByTargetVersion);
  }, [activeId, issues, pendingIssueIds, preferences, projectId, priorityId, search, statusId, trackedIssueIds, workFilter, workedTodayIssueIds]);
  return (
    <section className="stack">
      <div className="row issues-heading">
        <div>
          <div className="title">{t('issues')}</div>
          <div className="muted">{t('issueDescription')}</div>
        </div>
        <button className="button" onClick={onCreateIssue}>
          <Plus size={14} /> {t('newIssue')}
        </button>
      </div>
      <div className="filters-grid">
        <input
          aria-label="Pesquisar chamados"
          placeholder={t('searchIssues')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label={t('issues')} value={issueScope} onChange={(event) => setIssueScope(event.target.value as 'assigned' | 'all')}>
          <option value="assigned">{t('myIssues')}</option>
          <option value="all">{t('allAccessible')}</option>
        </select>
        <select aria-label="Filtrar por projeto" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">{t('allProjects')}</option>
          {projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Filtrar por status" value={statusId} onChange={(event) => setStatusId(event.target.value)}>
          <option value="">{t('allStatuses')}</option>
          {statuses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Filtrar por prioridade" value={priorityId} onChange={(event) => setPriorityId(event.target.value)}>
          <option value="">{t('allPriorities')}</option>
          {priorities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Filtrar por trabalho" value={workFilter} onChange={(event) => setWorkFilter(event.target.value as 'all' | 'pending' | 'today')}>
          <option value="all">{t('allIssues')}</option>
          <option value="pending">{t('pendingIssues')}</option>
          <option value="today">{t('workedToday')}</option>
        </select>
      </div>
      {groups.map((group) => (
        <section className={`card issue-group${collapsedGroups.has(group.key) ? ' collapsed' : ''}`} key={group.key}>
          <button
            className="issue-group-header"
            aria-expanded={!collapsedGroups.has(group.key)}
            aria-controls={`issue-group-${group.key}`}
            onClick={() => setCollapsedGroups((current) => {
              const next = new Set(current);
              if (next.has(group.key)) next.delete(group.key);
              else next.add(group.key);
              return next;
            })}
          >
            <span className="issue-group-heading">
              {collapsedGroups.has(group.key) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <span>
                <strong>{group.project}</strong>
                {group.version && <small>{group.version}</small>}
              </span>
            </span>
            <span className="pill">{group.issues.length}</span>
          </button>
          {!collapsedGroups.has(group.key) && <div id={`issue-group-${group.key}`} className="issue-group-content">{group.issues.map((issue) => (
            <div className="issue" key={issue.id}>
              <div className="row">
                <div>
                  <div className="title">
                    #{issue.id} {issue.subject}
                  </div>
                  <div className="muted">
                    {preferences.showIssueStatus && (issue.status?.name ?? 'Sem status')}
                    {preferences.showIssueStatus && preferences.showIssuePriority && ' · '}
                    {preferences.showIssuePriority && (issue.priority?.name ?? 'Sem prioridade')}
                    {preferences.showIssueDoneRatio && issue.done_ratio !== undefined && ` · ${issue.done_ratio}%`}
                  </div>
                </div>
                {issue.id === activeId && <span className="pill">ativo</span>}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  className="button"
                  onClick={() =>
                    onAction({
                      type: 'START_SESSION',
                      issueId: issue.id,
                      projectId: issue.project.id,
                    })
                  }
                >
                      <Play size={14} /> {t('start')}
                </button>
                <a
                  className="button secondary"
                  href={
                    redmineUrl ? redmineIssueUrl(redmineUrl, issue.id) : '#'
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (redmineUrl)
                      void chrome.tabs.create({
                        url: redmineIssueUrl(redmineUrl, issue.id),
                      });
                  }}
                >
                  <ExternalLink size={14} /> {t('open')}
                </a>
              </div>
            </div>
          ))}</div>}
        </section>
      ))}
      {!groups.length && (
        <div className="card muted">
          Nenhum chamado encontrado para os filtros selecionados.
        </div>
      )}
    </section>
  );
}

function ReportsTab({
  sessions,
  accountId,
  serverEntries,
  loading,
  onGenerateReport,
}: {
  sessions: ExtensionState['sessions'];
  accountId?: string;
  serverEntries: RedmineTimeEntry[];
  loading: boolean;
  onGenerateReport: () => void;
}) {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [from, setFrom] = useState(() => {
    const date = new Date();
    return localDateInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
  });
  const [to, setTo] = useState(() => localDateInputValue(new Date()));
  const [projectFilter, setProjectFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const accountSessions = useMemo(
    () => sessions.filter((session) => session.accountId === accountId),
    [accountId, sessions],
  );
  const projectOptions = useMemo(
    () => [...new Map(serverEntries
      .filter((entry) => entry.project)
      .map((entry) => [String(entry.project?.id), entry.project?.name ?? '']))],
    [serverEntries],
  );
  const issueOptions = useMemo(
    () => [...new Map(serverEntries
      .filter((entry) => entry.issue)
      .map((entry) => [String(entry.issue?.id), `#${entry.issue?.id}`]))],
    [serverEntries],
  );
  const filteredServerEntries = useMemo(
    () => serverEntries.filter((entry) =>
      (!projectFilter || String(entry.project?.id) === projectFilter) &&
      (!issueFilter || String(entry.issue?.id) === issueFilter),
    ),
    [issueFilter, projectFilter, serverEntries],
  );
  const filteredSessions = useMemo(
    () => accountSessions.filter((session) =>
      (!projectFilter || String(session.projectId) === projectFilter) &&
      (!issueFilter || String(session.issueId) === issueFilter),
    ),
    [accountSessions, issueFilter, projectFilter],
  );
  const summary = useMemo(
    () => summarizeReport({
      sessions: filteredSessions,
      serverEntries: filteredServerEntries,
      period,
      reference: new Date(),
      from,
      to,
    }),
    [filteredServerEntries, filteredSessions, from, period, to],
  );
  const dailySeries = useMemo(
    () => dailyReportSeries({
      sessions: filteredSessions,
      serverEntries: filteredServerEntries,
      period,
      reference: new Date(),
      from,
      to,
    }),
    [filteredServerEntries, filteredSessions, from, period, to],
  );
  const maxDailyHours = Math.max(
    ...dailySeries.map((point) => point.serverHours + point.localPendingHours),
    1,
  );
  const maxProjectHours = Math.max(...summary.byProject.map((item) => item.hours), 1);
  return (
    <section className="stack">
      <div className="row">
        <div>
          <div className="title">Produtividade</div>
          <div className="muted">{t('reportSummaryDescription')}</div>
        </div>
        <div className="row">
          <button
            className="button secondary"
            onClick={() => downloadTimeReportCsv({
              sessions: filteredSessions.filter((session) => session.status === 'pending' || session.status === 'reconciliation_required'),
              serverEntries: filteredServerEntries,
            })}
          >
            <Download size={14} /> CSV
          </button>
          <select aria-label={t('reportPeriod')} value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)}>
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
            <option value="month">{t('thisMonth')}</option>
            <option value="custom">{t('customPeriod')}</option>
          </select>
          <button className="button secondary" onClick={onGenerateReport}>
            <FileDown size={14} /> {t('exportPdf')}
          </button>
        </div>
      </div>
      {period === 'custom' && (
        <div className="settings-grid">
          <label>{t('from')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>{t('to')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
      )}
      <div className="settings-grid">
        <label>
          {t('project')}
          <select aria-label={t('reportProjectFilter')} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">{t('allProjects')}</option>
            {projectOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label>
        <label>
          {t('issues')}
          <select aria-label={t('reportIssueFilter')} value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
            <option value="">{t('allIssues')}</option>
            {issueOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="report-metrics">
        <div className="card"><span className="muted">{t('confirmedRedmine')}</span><strong>{loading ? '…' : `${summary.serverHours.toFixed(2)} h`}</strong></div>
        <div className="card"><span className="muted">{t('localPending')}</span><strong>{summary.localPendingHours.toFixed(2)} h</strong></div>
      </div>
      <div className="card stack">
        <div className="row">
          <div className="title">{t('hoursPerDay')}</div>
          <div className="report-legend"><span className="legend-server" /> Redmine <span className="legend-local" /> {t('localPending')}</div>
        </div>
        {loading ? <div className="muted">{t('loadingDailySeries')}</div> : (
          <div className="report-daily-list" aria-label={t('hoursPerDay')}>
            {dailySeries.map((point) => (
              <div className="report-daily-row" key={point.date} title={`${point.label}: ${(point.serverHours + point.localPendingHours).toFixed(2)} h`}>
                <span className="report-daily-label">{point.label}</span>
                <div className="report-daily-track">
                  <span className="report-daily-segment report-daily-segment-server" style={{ width: `${point.serverHours / maxDailyHours * 100}%` }} />
                  <span className="report-daily-segment report-daily-segment-local" style={{ width: `${point.localPendingHours / maxDailyHours * 100}%` }} />
                </div>
                <strong className="report-daily-total">{(point.serverHours + point.localPendingHours).toFixed(2)} h</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card stack">
        <div className="title">{t('hoursPerProject')}</div>
        {loading ? <div className="muted">{t('loadingEntries')}</div> : summary.byProject.length ? summary.byProject.map((item) => (
          <div className="report-row" key={item.label}>
            <div className="row"><span>{item.label}</span><strong>{item.hours.toFixed(2)} h</strong></div>
            <div className="report-bar"><span style={{ width: `${Math.max(4, item.hours / maxProjectHours * 100)}%` }} /></div>
          </div>
        )) : <div className="muted">{t('confirmedEntryEmpty')}</div>}
      </div>
      <div className="card stack">
        <div className="title">{t('hoursPerIssue')}</div>
        {loading ? <div className="muted">Carregando…</div> : summary.byIssue.length ? summary.byIssue.map((item) => (
          <div className="row" key={item.label}><span>{item.label}</span><strong>{item.hours.toFixed(2)} h</strong></div>
        )) : <div className="muted">{t('noIssueHours')}</div>}
      </div>
      <div className="card stack">
        <div className="title">Horas por atividade</div>
        {loading ? <div className="muted">Carregando…</div> : summary.byActivity.length ? summary.byActivity.map((item) => (
          <div className="row" key={item.label}><span>{item.label}</span><strong>{item.hours.toFixed(2)} h</strong></div>
        )) : <div className="muted">{t('noActivityHours')}</div>}
      </div>
    </section>
  );
}

function RedmineDescription({ value }: { value: string }) {
  const blocks = parseRedmineDescription(value);
  return (
    <div className="redmine-description">
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'heading') {
              const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          return <Heading key={blockIndex}>{renderDescriptionInline(block.text, `heading-${blockIndex}`)}</Heading>;
        }
        if (block.kind === 'paragraph') {
          return <p key={blockIndex}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderDescriptionInline(line, `paragraph-${blockIndex}-${lineIndex}`)}</span>)}</p>;
        }
        const List = block.ordered ? 'ol' : 'ul';
        return <List key={blockIndex}>{block.items.map((item, itemIndex) => <li key={itemIndex} style={{ marginLeft: `${Math.max(0, item.level - 1) * 18}px` }}>{renderDescriptionInline(item.text, `list-${blockIndex}-${itemIndex}`)}</li>)}</List>;
      })}
    </div>
  );
}

function renderDescriptionInline(value: string, keyPrefix: string) {
  return parseDescriptionInline(value).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.kind === 'strong') return <strong key={key}>{token.value}</strong>;
    if (token.kind === 'emphasis') return <em key={key}>{token.value}</em>;
    if (token.kind === 'underline') return <u key={key}>{token.value}</u>;
    if (token.kind === 'code') return <code key={key}>{token.value}</code>;
    if (token.kind === 'link') return <a key={key} href={token.href} target="_blank" rel="noreferrer">{token.value}</a>;
    return <span key={key}>{token.value}</span>;
  });
}

function BoardTab({
  issues,
  issuesLoading,
  board,
  redmineUrl,
  sessions,
  active,
  activeSeconds,
  onSave,
  onAction,
  onRefreshIssues,
}: {
  issues: RedmineIssue[];
  issuesLoading: boolean;
  board: BoardState;
  redmineUrl: string;
  sessions: ExtensionState['sessions'];
  active?: ExtensionState['sessions'][number];
  activeSeconds: number;
  onSave: (board: BoardState) => Promise<void>;
  onAction: (message: RuntimeMessage) => void;
  onRefreshIssues: () => void;
}) {
  const [draft, setDraft] = useState(() => ensureBoardCards(board, issues));
  const [search, setSearch] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const [detailsIssue, setDetailsIssue] = useState<RedmineIssue | null>(null);
  const [detailsEntries, setDetailsEntries] = useState<RedmineTimeEntry[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [showDetailsEntries, setShowDetailsEntries] = useState(false);
  useEffect(() => {
    const next = ensureBoardCards(board, issues);
    setDraft(next);
    if (next.cards.length !== board.cards.length || next.columns.length !== board.columns.length)
      void onSave(next);
  }, [board, issues]);
  const persist = (next: BoardState) => {
    setDraft(next);
    void onSave(next);
  };
  const openIssueDetails = async (issueId: number) => {
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsIssue(null);
    setDetailsEntries([]);
    setShowDetailsEntries(false);
    const [issueResult, entriesResult] = await Promise.all([
      send({ type: 'GET_ISSUE', issueId }),
      send({ type: 'GET_TIME_ENTRIES', issueId }),
    ]);
    if (issueResult.ok) setDetailsIssue((issueResult.issue ?? null) as RedmineIssue | null);
    else setDetailsError(issueResult.error);
    if (entriesResult.ok) setDetailsEntries((entriesResult.timeEntries ?? []) as RedmineTimeEntry[]);
    else setDetailsError((current) => current || entriesResult.error);
    setDetailsLoading(false);
  };
  const addColumn = () => {
    const title = window.prompt('Nome da nova coluna:')?.trim();
    if (!title) return;
    const next: BoardState = {
      ...draft,
      columns: [...draft.columns, {
        id: `board-${crypto.randomUUID()}`,
        title,
        color: '#5579d8',
        order: draft.columns.length,
      }],
    };
    persist(next);
  };
  const renameColumn = (columnId: string, currentTitle: string) => {
    const title = window.prompt('Nome da coluna:', currentTitle)?.trim();
    if (!title || title === currentTitle) return;
    persist({
      ...draft,
      columns: draft.columns.map((column) => column.id === columnId ? { ...column, title } : column),
    });
  };
  const removeColumn = (columnId: string) => {
    if (draft.columns.length <= 1 || !window.confirm(t('deleteColumnConfirm'))) return;
    const fallback = draft.columns.find((column) => column.id !== columnId)?.id;
    if (!fallback) return;
    persist({
      columns: draft.columns.filter((column) => column.id !== columnId).map((column, index) => ({ ...column, order: index })),
      cards: draft.cards.map((card) => card.columnId === columnId ? { ...card, columnId: fallback } : card),
    });
  };
  const moveCard = (issueId: number, columnId: string, targetIssueId?: number) => {
    if (targetIssueId) {
      persist(moveBoardCard(draft, issueId, targetIssueId, columnId));
      return;
    }
    persist({ ...draft, cards: draft.cards.map((card) => card.issueId === issueId ? { ...card, columnId } : card) });
  };
  const moveColumn = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ordered = [...draft.columns].sort((a, b) => a.order - b.order);
    const sourceIndex = ordered.findIndex((column) => column.id === sourceId);
    const targetIndex = ordered.findIndex((column) => column.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [source] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, source);
    persist({ ...draft, columns: ordered.map((column, index) => ({ ...column, order: index })) });
  };
  const pendingIds = new Set(sessions.filter((session) => session.status === 'pending' || session.status === 'reconciliation_required').map((session) => session.issueId));
  const projectScopedIssues = issues;
  const displayColumnTitle = (title: string) => title === 'A fazer' ? t('boardTodo') : title === 'Em andamento' ? t('boardDoing') : title === 'Concluído' ? t('boardDone') : title;
  const filteredIssues = projectScopedIssues.filter((issue) =>
    (!search || `${issue.id} ${issue.subject}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) &&
    (!project || String(issue.project.id) === project) &&
    (!priority || String(issue.priority?.id) === priority) &&
    (!onlyPending || pendingIds.has(issue.id)) &&
    (!onlyActive || active?.issueId === issue.id),
  );
  const projectOptions = [...new Map(issues.map((issue) => [issue.project.id, issue.project.name]))];
  const priorityOptions = [...new Map(issues.filter((issue) => issue.priority).map((issue) => [issue.priority?.id, issue.priority?.name ?? '']))];
  return (
    <section className="board-page">
      <div className="row board-heading">
        <div><div className="title">{t('myBoard')}</div><div className="muted">{t('boardDescription')}</div></div>
        <div className="row">
          <button className="button secondary" onClick={onRefreshIssues} disabled={issuesLoading}><RefreshCw size={14} /> {issuesLoading ? t('loadingIssues') : t('refreshIssues')}</button>
          <button className="button" onClick={addColumn}><Plus size={14} /> {t('newColumn')}</button>
        </div>
      </div>
      <div className="card board-load-status">
        <span>{issuesLoading ? t('queryingIssues') : `${issues.length} ${t('issuesLoaded')}`}</span>
        {!issuesLoading && !issues.length && <span className="muted">{t('noIssuesReturned')}</span>}
      </div>
      {active && (
        <div className="board-active-timer">
          <div>
            <span className="muted">{t('sessionInProgress')}</span>
            <strong>#{active.issueId}</strong>
          </div>
          <strong className="board-active-time">{formatSeconds(activeSeconds)}</strong>
          <div className="row">
            <button className="button secondary" onClick={() => onAction({ type: active.status === 'paused' ? 'RESUME_SESSION' : 'PAUSE_SESSION' })}>
              {active.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
              {active.status === 'paused' ? 'Retomar' : 'Pausar'}
            </button>
            <button className="button danger" onClick={() => onAction({ type: 'STOP_SESSION' })}><Square size={13} /> Parar</button>
          </div>
        </div>
      )}
      <div className="board-filters">
        <input aria-label={t('searchBoard')} placeholder={t('searchIssues')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label={t('filterBoardProject')} value={project} onChange={(event) => setProject(event.target.value)}><option value="">{t('allProjects')}</option>{projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <select aria-label={t('filterBoardPriority')} value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">{t('allPriorities')}</option>{priorityOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <label className="board-check"><input type="checkbox" checked={onlyPending} onChange={(event) => setOnlyPending(event.target.checked)} /> {t('pendingLabel')}</label>
        <label className="board-check"><input type="checkbox" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} /> {t('activeLabel')}</label>
      </div>
      <div className="board-grid">
        {[...draft.columns].sort((a, b) => a.order - b.order).map((column) => {
          const columnCards = draft.cards.filter((card) => card.columnId === column.id).map((card) => filteredIssues.find((issue) => issue.id === card.issueId)).filter((issue): issue is RedmineIssue => Boolean(issue));
          return (
            <div className="board-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const columnId = event.dataTransfer.getData('column-id'); if (columnId) moveColumn(columnId, column.id); else { const id = Number(event.dataTransfer.getData('issue-id')); if (id) moveCard(id, column.id); } }}>
              <div className="board-column-heading" draggable onDragStart={(event) => event.dataTransfer.setData('column-id', column.id)}>
                <span><input className="board-color" type="color" value={column.color} aria-label={`${t('extensionColor')}: ${displayColumnTitle(column.title)}`} onChange={(event) => persist({ ...draft, columns: draft.columns.map((item) => item.id === column.id ? { ...item, color: event.target.value } : item) })} /><i style={{ background: column.color }} />{displayColumnTitle(column.title)} <em>{columnCards.length}</em></span>
                <span className="row">
                  <button className="icon-button" title={t('renameColumn')} aria-label={t('renameColumn')} onClick={() => renameColumn(column.id, column.title)}>✎</button>
                  <button className="icon-button" title={t('deleteColumn')} aria-label={t('deleteColumn')} onClick={() => removeColumn(column.id)}><Trash2 size={13} /></button>
                </span>
              </div>
              <div className="board-cards">
                {columnCards.map((issue) => (
                  <article className={`board-card${active?.issueId === issue.id ? ' tracked' : ''}`} style={{ borderLeftColor: column.color }} key={issue.id} draggable onDragStart={(event) => event.dataTransfer.setData('issue-id', String(issue.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); const id = Number(event.dataTransfer.getData('issue-id')); if (id) moveCard(id, column.id, issue.id); }}>
                    <div className="muted">#{issue.id} · {issue.project.name}</div>
                    <button className="board-card-title" onClick={(event) => { event.stopPropagation(); void openIssueDetails(issue.id); }}>{issue.subject}</button>
                    <div className="row board-card-meta"><span className="board-priority-label">{issue.priority?.name ?? 'Sem prioridade'}</span>{issue.done_ratio !== undefined && <span className="muted">{issue.done_ratio}%</span>}</div>
                    {active?.issueId === issue.id && <div className="board-card-timer">{active.status === 'paused' ? t('paused') : t('active')} · {formatSeconds(activeSeconds)}</div>}
                    <div className="row board-card-actions">
                      <button className="button" onClick={() => onAction({ type: 'START_SESSION', issueId: issue.id, projectId: issue.project.id })}><Play size={12} /> Timer</button>
                      <a className="button secondary" href={redmineUrl ? redmineIssueUrl(redmineUrl, issue.id) : '#'} onClick={(event) => { event.preventDefault(); if (redmineUrl) void chrome.tabs.create({ url: redmineIssueUrl(redmineUrl, issue.id) }); }}>Abrir</a>
                    </div>
                  </article>
                ))}
                {!columnCards.length && <div className="board-empty">{t('dragIssuesHere')}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {(detailsLoading || detailsError || detailsIssue) && (
        <div className="modal-backdrop" role="presentation" onClick={() => { if (!detailsLoading) { setDetailsIssue(null); setDetailsError(''); } }}>
          <div className="modal board-issue-modal" role="dialog" aria-modal="true" aria-labelledby="board-issue-details-title" onClick={(event) => event.stopPropagation()}>
            <div className="row">
              <div className="board-issue-modal-title" id="board-issue-details-title">{detailsIssue ? `#${detailsIssue.id} ${detailsIssue.subject}` : t('issueDetails')}</div>
              <button className="icon-button board-modal-close" aria-label={t('closeDetails')} title={t('close')} disabled={detailsLoading} onClick={() => { setDetailsIssue(null); setDetailsError(''); }}><X size={20} strokeWidth={2.5} /></button>
            </div>
            {detailsLoading && <div className="muted">Carregando detalhes do chamado…</div>}
            {detailsError && <div className="error">{detailsError}</div>}
            {detailsIssue && !detailsLoading && (
              <div className="stack board-issue-details">
                <div className="board-issue-project">{detailsIssue.project.name}{detailsIssue.tracker ? ` · ${detailsIssue.tracker.name}` : ''}</div>
                <div className="board-issue-meta"><span>{t('status')} <strong>{detailsIssue.status?.name ?? t('notInformed')}</strong></span><span>{t('priority')} <strong>{detailsIssue.priority?.name ?? t('notInformed')}</strong></span>{detailsIssue.done_ratio !== undefined && <span>{t('completion')} <strong>{detailsIssue.done_ratio}%</strong></span>}</div>
                <div className="board-issue-description">{detailsIssue.description?.trim() ? <RedmineDescription value={detailsIssue.description} /> : t('noIssueDescription')}</div>
                <div className="stack board-issue-time-entries">
                  <button className="board-time-toggle" aria-expanded={showDetailsEntries} onClick={() => setShowDetailsEntries((current) => !current)}>
                    <span><strong>{t('recordedHours')}</strong><small>{detailsEntries.length ? `${detailsEntries.length} ${t('entries')}` : t('none')}</small></span>
                    <span className="row"><strong>{detailsEntries.reduce((total, entry) => total + entry.hours, 0).toFixed(2)} h</strong><span aria-hidden="true">{showDetailsEntries ? '⌃' : '⌄'}</span></span>
                  </button>
                  {showDetailsEntries && (detailsEntries.length ? detailsEntries.map((entry) => (
                    <div className="board-time-entry" key={entry.id}>
                      <div className="row"><strong>{entry.spent_on}</strong><span className="board-time-entry-hours">{entry.hours.toFixed(2)} h</span></div>
                      <div className="muted">{entry.activity?.name ?? 'Sem atividade'}{entry.comments ? ` · ${entry.comments}` : ''}</div>
                    </div>
                  )) : <div className="muted">{t('noRecordedEntries')}</div>)}
                </div>
                <div className="row">
                  <button className="button" onClick={() => onAction({ type: 'START_SESSION', issueId: detailsIssue.id, projectId: detailsIssue.project.id })}><Play size={13} /> {t('startTimer')}</button>
                  <a className="button secondary" href={redmineIssueUrl(redmineUrl, detailsIssue.id)} onClick={(event) => { event.preventDefault(); void chrome.tabs.create({ url: redmineIssueUrl(redmineUrl, detailsIssue.id) }); }}>{t('openInRedmine')}</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function HoursTab({
  sessions,
  accountId,
  activities,
  timeEntries,
  preferences,
  onAction,
  onGenerateReport,
}: {
  sessions: ExtensionState['sessions'];
  accountId?: string;
  activities: RedmineActivity[];
  timeEntries: RedmineTimeEntry[];
  preferences: Preferences;
  onAction: (message: RuntimeMessage) => void;
  onGenerateReport: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pending = sessions.filter(
    (session) =>
      session.accountId === accountId &&
      (session.status === 'pending' ||
        session.status === 'reconciliation_required'),
  );
  const selectedSessions = pending.filter((session) =>
    selectedIds.includes(session.id),
  );
  const selectedNeedsActivity = selectedSessions.some(
    (session) => !session.activityId,
  );
  const serverTotal = timeEntries.reduce((total, entry) => total + entry.hours, 0);
  const toggleSelected = (sessionId: string) =>
    setSelectedIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  return (
    <section className="stack">
      <div className="card">
        <div className="row">
          <div className="title">{t('pendingEntries')}</div>
          <div className="row">
            <span className="pill">{pending.length}</span>
            {pending.length > 0 && (
              <button
                className="button secondary"
                disabled={!selectedIds.length || selectedNeedsActivity}
                title={
                  selectedNeedsActivity
                    ? t('selectActivityBeforeSubmit')
                    : undefined
                }
                onClick={() =>
                  onAction({
                    type: 'SUBMIT_SESSIONS',
                    sessionIds: selectedIds,
                  })
                }
              >
                <Send size={14} /> {t('submitSelected')} ({selectedIds.length})
              </button>
            )}
            <button
              className="button secondary"
              onClick={onGenerateReport}
              title={t('reportPdfTitle')}
            >
              <FileDown size={14} /> {t('generatePdf')}
            </button>
          </div>
        </div>
        {pending.map((session) => (
          <PendingSession
            key={session.id}
            session={session}
            activities={activities}
            preferences={preferences}
            onAction={onAction}
            selected={selectedIds.includes(session.id)}
            onToggle={() => toggleSelected(session.id)}
            onDelete={() => {
              if (
                window.confirm(
                  `${t('deleteSessionConfirm')} #${session.issueId}?`,
                )
              ) {
                setSelectedIds((current) =>
                  current.filter((id) => id !== session.id),
                );
                onAction({ type: 'DELETE_SESSION', sessionId: session.id });
              }
            }}
          />
        ))}
        {!pending.length && (
          <div className="muted" style={{ marginTop: 8 }}>
            {t('allCaughtUp')}
          </div>
        )}
      </div>
      <div className="card">
        <div className="row">
          <div className="title">{t('redmineLoggedTime')}</div>
          <span className="pill">{serverTotal.toFixed(2)} h</span>
        </div>
        <div className="muted">
          {timeEntries.length
            ? `${timeEntries.length} ${t('serverEntriesReturned')}`
            : t('noServerEntries')}
        </div>
        {timeEntries.slice(0, 20).map((entry) => (
          <div className="issue" key={entry.id}>
            <div className="row">
              <strong>{entry.issue ? `#${entry.issue.id}` : t('noIssue')}</strong>
              <span className="pill">{entry.hours.toFixed(2)} h</span>
            </div>
            <div className="muted">
              {entry.spent_on} · {entry.activity?.name ?? t('noActivity')}
              {entry.comments ? ` · ${entry.comments}` : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PendingSession({
  session,
  activities,
  preferences,
  onAction,
  selected,
  onToggle,
  onDelete,
}: {
  session: ExtensionState['sessions'][number];
  activities: RedmineActivity[];
  preferences: Preferences;
  onAction: (message: RuntimeMessage) => void;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const suggestedHours = getSuggestedEntryHours(
    session.durationSeconds,
    preferences.roundToInterval,
  );
  const suggestedHoursLabel = suggestedHours.toFixed(2);
  const [hours, setHours] = useState(
    session.draftHours?.toFixed(2) ?? suggestedHoursLabel,
  );
  const [comments, setComments] = useState(session.description);
  const [spentOn, setSpentOn] = useState(session.spentOn);
  const [activityId, setActivityId] = useState(
    session.activityId?.toString() ?? activities[0]?.id?.toString() ?? '',
  );
  const [submitting, setSubmitting] = useState(false);
  const persistDraft = (
    nextComments: string,
    nextActivityId: string,
    nextSpentOn = spentOn,
    nextHours = hours,
  ) => {
    void onAction({
      type: 'UPDATE_SESSION_DRAFT',
      sessionId: session.id,
      comments: preferences.persistentComments
        ? nextComments
        : session.description,
      activityId: nextActivityId ? Number(nextActivityId) : null,
      spentOn: nextSpentOn,
      draftHours: Number(nextHours.replace(',', '.')) || null,
    });
  };
  useEffect(() => {
    const defaultActivity = activities[0];
    if (session.activityId || !defaultActivity) return;
    const nextActivityId = String(defaultActivity.id);
    setActivityId(nextActivityId);
    persistDraft(comments, nextActivityId, spentOn, hours);
  }, [activities, comments, hours, session.activityId, session.id, spentOn]);
  return (
    <div className="issue">
      <div className="row">
        <label className="row">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`${t('selectSession')} ${session.issueId}`}
          />
          <strong>#{session.issueId}</strong>
        </label>
        <span className="pill">{formatSeconds(session.durationSeconds)}</span>
        {session.status === 'reconciliation_required' && (
          <span className="pill">{t('reviewRequired')}</span>
        )}
      </div>
      <div className="stack" style={{ marginTop: 8 }}>
        <div className="row">
          <input
            aria-label="Horas"
            value={hours}
            onChange={(e) => {
              setHours(e.target.value);
              persistDraft(comments, activityId, spentOn, e.target.value);
            }}
          />
          <select
            aria-label={t('activity')}
            value={activityId}
            onChange={(e) => {
              setActivityId(e.target.value);
              persistDraft(comments, e.target.value);
            }}
          >
            <option value="">{t('activity')}</option>
            {activities.map((activity) => (
              <option value={activity.id} key={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </div>
        <label>
          {t('entryDate')}
          <input
            aria-label={t('entryDateAria')}
            type="date"
            value={spentOn}
            onChange={(e) => {
              setSpentOn(e.target.value);
              persistDraft(comments, activityId, e.target.value, hours);
            }}
          />
        </label>
        <div className="muted">
          {t('suggestion')}: {suggestedHoursLabel} h. {t('actualDuration')}
          {' '}{formatSeconds(session.durationSeconds)}.
        </div>
        <textarea
          aria-label={t('descriptionAria')}
          rows={2}
          value={comments}
          onChange={(e) => {
            setComments(e.target.value);
            persistDraft(e.target.value, activityId);
          }}
          placeholder={t('workDescription')}
        />
        {session.status === 'reconciliation_required' ? (
          <button
            className="button secondary"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onAction({ type: 'RECONCILE_SESSION', sessionId: session.id });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <RefreshCw size={14} /> {submitting ? t('loading') : t('verifyRedmine')}
          </button>
        ) : (
          <button
            className="button"
            disabled={!activityId || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onAction({
                  type: 'SUBMIT_SESSION',
                  sessionId: session.id,
                  activityId: Number(activityId),
                  comments,
                  spentOn,
                  hours: Number(hours.replace(',', '.')),
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Send size={14} /> {submitting ? 'Registrando…' : 'Registrar horas'}
          </button>
        )}
        <button className="button secondary" onClick={onDelete}>
          {t('excludeSession')}
        </button>
      </div>
    </div>
  );
}

function SettingsTab({
  state,
  onConnected,
  onSave,
  onOpenChangelog,
  onLanguageChange,
}: {
  state: ExtensionState;
  onConnected: (state: ExtensionState) => void;
  onSave: (
    url: string,
    apiKey: string,
    preferences: Preferences,
  ) => Promise<boolean>;
  onOpenChangelog: () => void;
  onLanguageChange: (language: Preferences['language']) => Promise<void>;
}) {
  const [url, setUrl] = useState(
    state.account?.redmineUrl ?? state.savedConfig?.redmineUrl ?? '',
  );
  const [apiKey, setApiKey] = useState('');
  const [preferences, setPreferences] = useState(state.preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{
    accountConnected: boolean;
    redmineUrl?: string;
    permissionGranted: boolean;
    schemaVersion: number;
    sessionCount: number;
    pendingCount: number;
    activeIssueId?: number;
  } | null>(null);
  const connect = async () => {
    setError('');
    try {
      const normalizedUrl = normalizeRedmineUrl(url);
      const insecure = isInsecureRedmineUrl(normalizedUrl);
      if (
        insecure &&
        !window.confirm(
          'Esta instância usa HTTP sem criptografia. A API Key e os dados trafegarão sem HTTPS e podem ser interceptados. Deseja continuar?',
        )
      )
        return;
      const origin = redmineOriginPattern(normalizedUrl);
      if (chrome.permissions?.request) {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted)
          throw new Error(
            'Acesso ao domínio não foi autorizado. Permita o acesso ao Redmine para testar a conexão.',
          );
      }
      setBusy(true);
      const result = await send({
        type: 'CONNECT',
        url: normalizedUrl,
        apiKey,
        allowInsecureHttp: insecure,
      });
      if (!result.ok) setError(result.error);
      else onConnected(result.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'URL inválida.');
    } finally {
      setBusy(false);
    }
  };
  const setPref = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const save = async () => {
    setBusy(true);
    setError('');
    const ok = await onSave(url, apiKey, preferences);
    setSaved(ok);
    setBusy(false);
  };
  const exportBackup = () => {
    try {
      const backup = createLocalBackup(state);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `geja-time-tracker-backup-${backup.exportedAt.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (backupError) {
      setError(
        backupError instanceof Error
          ? backupError.message
          : 'Não foi possível exportar o backup.',
      );
    }
  };
  const importBackup = async (file: File) => {
    if (
      !window.confirm(
        'Importar este backup substituirá as sessões locais da conta atual. Deseja continuar?',
      )
    )
      return;
    setBackupBusy(true);
    setError('');
    try {
      const backup = JSON.parse(await file.text());
      const result = await send({ type: 'IMPORT_LOCAL_BACKUP', backup });
      if (!result.ok) throw new Error(result.error);
      onConnected(result.state);
      setSaved(true);
    } catch (backupError) {
      setError(
        backupError instanceof Error
          ? backupError.message
          : 'Não foi possível importar o backup.',
      );
    } finally {
      setBackupBusy(false);
    }
  };
  const loadDiagnostics = async () => {
    setBackupBusy(true);
    setError('');
    try {
      const result = await send({ type: 'GET_DIAGNOSTICS' });
      if (!result.ok) throw new Error(result.error);
      setDiagnostic(result.diagnostics ?? null);
    } catch (diagnosticError) {
      setError(
        diagnosticError instanceof Error
          ? diagnosticError.message
          : 'Não foi possível carregar o diagnóstico.',
      );
    } finally {
      setBackupBusy(false);
    }
  };
  return (
    <section className="stack">
      <div className="card stack">
        <div className="row">
          <div>
            <div className="title">{t('general')}</div>
            <div className="muted">{t('whatsNewDescription')}</div>
          </div>
          <button className="button secondary" onClick={onOpenChangelog}>{t('whatsNew')}</button>
        </div>
        <label>
          {t('language')}
          <select value={preferences.language} onChange={(e) => {
            const language = e.target.value as Preferences['language'];
            setPref('language', language);
            void onLanguageChange(language);
          }}>
            <option value="auto">{t('languageAuto')}</option>
            <option value="pt-BR">{t('languagePt')}</option>
            <option value="en">{t('languageEn')}</option>
          </select>
        </label>
        <div className="rating-callout">
          <div>
            <strong>{t('rateTitle')}</strong>
            <span>{t('rateDescription')}</span>
          </div>
          <a
            className="button secondary"
            href="https://chromewebstore.google.com/detail/geja-time-tracker-redmine/cijcdkdpmnhcbfadlnhkjmbpjknffhkb?authuser=0&hl=pt-BR"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> {t('rateNow')}
          </a>
        </div>
      </div>
      <div className="card stack">
        <div className="row">
          <div>
            <div className="title">Redmine Time Tracking</div>
            <div className="muted">
              {t('referenceVersion')}
            </div>
          </div>
          <ExternalLink size={16} />
        </div>
        <div className="muted">
          {t('referenceDescription')}
        </div>
        <div className="row">
          <a
            className="button secondary"
            href="https://github.com/nadojba/geja-time-tracker"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> GitHub
          </a>
          <a
            className="button secondary"
            href="https://github.com/nadojba/geja-time-tracker/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> {t('reportIssue')}
          </a>
        </div>
      </div>
      <div className="card stack">
        <div className="title">{t('backupDiagnostics')}</div>
        <div className="muted">{t('backupDescription')}</div>
        <div className="row">
          <button className="button secondary" disabled={!state.account || backupBusy} onClick={exportBackup}>
            <Download size={14} /> {t('exportBackup')}
          </button>
          <label className="button secondary file-button">
            <Upload size={14} /> {t('importBackup')}
            <input
              type="file"
              accept="application/json,.json"
              disabled={!state.account || backupBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importBackup(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <button className="button secondary" disabled={backupBusy} onClick={() => void loadDiagnostics()}>
            <Stethoscope size={14} /> {t('diagnostics')}
          </button>
        </div>
        {diagnostic && (
          <div className="diagnostic-grid">
            <span>{t('connectedAccount')}</span><strong>{diagnostic.accountConnected ? 'Sim' : 'Não'}</strong>
            <span>{t('domainPermission')}</span><strong>{diagnostic.permissionGranted ? t('granted') : t('missing')}</strong>
            <span>{t('localSessions')}</span><strong>{diagnostic.sessionCount}</strong>
            <span>{t('pending')}</span><strong>{diagnostic.pendingCount}</strong>
            <span>{t('activeIssue')}</span><strong>{diagnostic.activeIssueId ? `#${diagnostic.activeIssueId}` : t('none')}</strong>
            <span>{t('localSchema')}</span><strong>v{diagnostic.schemaVersion}</strong>
          </div>
        )}
      </div>
      <div className="card stack">
        <div className="title">{t('redmine')}</div>
        <label>
          {t('serverUrl')}
          <input
            type="url"
            placeholder="https://redmine.empresa.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label>
          {t('apiKey')}
          <input
            type="password"
            autoComplete="off"
            placeholder={
              state.savedConfig
                ? t('savedApiKeyPlaceholder')
                : t('pasteApiKey')
            }
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        {state.account && (
          <div className="success">
            {t('connectedAs')} {state.account.user.name} ({state.account.user.login}
            )
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <div className="row">
          <button
            className="button secondary"
            disabled={busy || !url}
            onClick={() => void save()}
          >
            {t('save')}
          </button>
          <button
            className="button"
            disabled={busy || !url}
            onClick={() => void connect()}
          >
            {busy ? t('testing') : t('testConnection')}
          </button>
        </div>
      </div>
      <div className="card stack">
        <div className="title">{t('behavior')}</div>
        <label>
          <input type="checkbox" checked={preferences.notificationsEnabled} onChange={(e) => setPref('notificationsEnabled', e.target.checked)} />{' '}
          {t('enableNotifications')}
        </label>
        <label>
          <input type="checkbox" checked={preferences.notifyOnPause} onChange={(e) => setPref('notifyOnPause', e.target.checked)} />{' '}
          {t('notifyPause')}
        </label>
        <label>
          <input type="checkbox" checked={preferences.notifyOnStop} onChange={(e) => setPref('notifyOnStop', e.target.checked)} />{' '}
          {t('notifyStop')}
        </label>
        <label>
          <input type="checkbox" checked={preferences.notifyOnReconciliation} onChange={(e) => setPref('notifyOnReconciliation', e.target.checked)} />{' '}
          {t('notifyReconciliation')}
        </label>
        <label>
          {t('notifyAfter')}
          <select value={preferences.notifyLongRunningMinutes} onChange={(e) => setPref('notifyLongRunningMinutes', Number(e.target.value))}>
            <option value={120}>2 horas</option>
            <option value={240}>4 horas</option>
            <option value={360}>6 horas</option>
            <option value={480}>8 horas</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.autoPause}
            onChange={(e) => setPref('autoPause', e.target.checked)}
          />{' '}
          {t('autoPause')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.confirmBeforeSwitchingIssues}
            onChange={(e) =>
              setPref('confirmBeforeSwitchingIssues', e.target.checked)
            }
          />{' '}
          {t('confirmSwitch')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.persistentComments}
            onChange={(e) => setPref('persistentComments', e.target.checked)}
          />{' '}
          {t('persistentComments')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.showCurrentIssueTimer}
            onChange={(e) => setPref('showCurrentIssueTimer', e.target.checked)}
          />{' '}
          {t('showIssueTimer')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.pauseOnTabClose}
            onChange={(e) => setPref('pauseOnTabClose', e.target.checked)}
          />{' '}
          {t('pauseOnTabClose')}
        </label>
        <label>
          {t('openTimerWindow')}
          <select
            value={preferences.timerWindowBehavior}
            onChange={(e) =>
              setPref(
                'timerWindowBehavior',
                e.target.value as Preferences['timerWindowBehavior'],
              )
            }
          >
            <option value="manual">{t('onlyOnClickWindow')}</option>
            <option value="on-start">{t('onSessionStart')}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.closeTimerWindowWhenInactive}
            onChange={(e) =>
              setPref('closeTimerWindowWhenInactive', e.target.checked)
            }
          />{' '}
          {t('closeWindowInactive')}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={preferences.roundToInterval.enabled}
            onChange={(e) =>
              setPref('roundToInterval', {
                ...preferences.roundToInterval,
                enabled: e.target.checked,
              })
            }
          />{' '}
          {t('roundSuggestion')}
        </label>
        <div className="settings-grid">
          <label>
            {t('mode')}
            <select
              disabled={!preferences.roundToInterval.enabled}
              value={preferences.roundToInterval.mode}
              onChange={(e) =>
                setPref('roundToInterval', {
                  ...preferences.roundToInterval,
                  mode: e.target.value as 'down' | 'nearest' | 'up',
                })
              }
            >
              <option value="down">{t('down')}</option>
              <option value="nearest">{t('nearest')}</option>
              <option value="up">{t('up')}</option>
            </select>
          </label>
          <label>
            {t('interval')}
            <select
              disabled={!preferences.roundToInterval.enabled}
              value={preferences.roundToInterval.minutes}
              onChange={(e) =>
                setPref('roundToInterval', {
                  ...preferences.roundToInterval,
                  minutes: Number(e.target.value),
                })
              }
            >
              <option value={5}>5 {t('minutes')}</option>
              <option value={10}>10 {t('minutes')}</option>
              <option value={15}>15 {t('minutes')}</option>
              <option value={30}>30 {t('minutes')}</option>
              <option value={60}>60 {t('minutes')}</option>
            </select>
          </label>
        </div>
        <div className="muted">
          {t('roundingNote')}
        </div>
        <div className="row">
          <button className="button" onClick={() => void save()}>
            {t('save')}
          </button>
          {saved && <span className="success">Salvo.</span>}
        </div>
      </div>
      <div className="card stack">
        <div className="title">{t('styling')}</div>
        <label>
          {t('theme')}
          <select
            value={preferences.theme}
            onChange={(e) =>
              setPref('theme', e.target.value as Preferences['theme'])
            }
          >
            <option value="system">{t('system')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </label>
        <label>
          {t('accentColor')}
          <select
            value={preferences.accentColor}
            onChange={(e) =>
              setPref(
                'accentColor',
                e.target.value as Preferences['accentColor'],
              )
            }
          >
            <option value="blue">{t('blue')}</option>
            <option value="indigo">{t('indigo')}</option>
            <option value="green">{t('green')}</option>
            <option value="violet">{t('violet')}</option>
            <option value="orange">{t('orange')}</option>
          </select>
        </label>
        <label>
          {t('widgetModel')}
          <select
            value={preferences.widgetStyle}
            onChange={(e) =>
              setPref(
                'widgetStyle',
                e.target.value as Preferences['widgetStyle'],
              )
            }
          >
            <option value="compact">{t('compact')}</option>
            <option value="minimal">{t('discreet')}</option>
            <option value="prominent">{t('prominent')}</option>
          </select>
        </label>
        <label>
          {t('widgetSize')}
          <select
            value={preferences.widgetTimerSize}
            onChange={(e) =>
              setPref(
                'widgetTimerSize',
                e.target.value as Preferences['widgetTimerSize'],
              )
            }
          >
            <option value="small">{t('compact')}</option>
            <option value="medium">{t('normal')}</option>
            <option value="large">{t('large')}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.showFloatingWidget}
            onChange={(e) => setPref('showFloatingWidget', e.target.checked)}
          />{' '}
          {t('floatingWidget')}
        </label>
        <div className="muted">
          {t('styleNote')}
        </div>
        <div className="row">
          <button className="button" onClick={() => void save()}>
            {t('save')}
          </button>
          {saved && <span className="success">Salvo.</span>}
        </div>
      </div>
    </section>
  );
}
