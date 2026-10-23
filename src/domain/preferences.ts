export interface Preferences {
  language: 'auto' | 'pt-BR' | 'en';
  theme: 'system' | 'light' | 'dark';
  timeFormat: '12h' | '24h';
  durationFormat: 'hh:mm:ss';
  autoPause: boolean;
  roundToInterval: { enabled: boolean; minutes: number; mode: 'down' | 'nearest' | 'up' };
  persistentComments: boolean;
  showCurrentIssueTimer: boolean;
  confirmBeforeSwitchingIssues: boolean;
  stopTimerBehavior: 'save' | 'save-and-open';
  displaySearchAlways: boolean;
  stickyScroll: boolean;
  groupIssuesByTargetVersion: boolean;
  sortIssuesByPriority: boolean;
  showIssuePriority: boolean;
  showIssueDoneRatio: boolean;
  showIssueStatus: boolean;
  showTimerSessions: boolean;
  pinTrackedIssues: boolean;
  pinActiveTabIssue: boolean;
  fullscreenSidebar: boolean;
  showTooltips: boolean;
  accentColor: 'blue' | 'indigo' | 'green' | 'violet' | 'orange';
  widgetStyle: 'compact' | 'minimal' | 'prominent';
}

export const defaultPreferences: Preferences = {
  language: 'pt-BR', theme: 'system', timeFormat: '24h', durationFormat: 'hh:mm:ss', autoPause: true,
  roundToInterval: { enabled: true, minutes: 15, mode: 'nearest' }, persistentComments: true,
  showCurrentIssueTimer: true, confirmBeforeSwitchingIssues: true, stopTimerBehavior: 'save',
  displaySearchAlways: true, stickyScroll: true, groupIssuesByTargetVersion: false, sortIssuesByPriority: true,
  showIssuePriority: true, showIssueDoneRatio: true, showIssueStatus: true, showTimerSessions: true,
  pinTrackedIssues: true, pinActiveTabIssue: true, fullscreenSidebar: false, showTooltips: true,
  accentColor: 'blue', widgetStyle: 'compact',
};

export function roundDurationSeconds(seconds: number, config: Preferences['roundToInterval']): number {
  if (!config.enabled || config.minutes <= 0) return seconds;

  const intervalSeconds = config.minutes * 60;
  const units = seconds / intervalSeconds;
  const roundedUnits = config.mode === 'down' ? Math.floor(units) : config.mode === 'up' ? Math.ceil(units) : Math.round(units);
  return roundedUnits * intervalSeconds;
}

export function getSuggestedDurationSeconds(seconds: number, config: Preferences['roundToInterval']): number {
  const rounded = roundDurationSeconds(seconds, config);
  return seconds > 0 && rounded <= 0 ? seconds : rounded;
}

export function getSuggestedEntryHours(seconds: number, config: Preferences['roundToInterval']): number {
  const suggestedSeconds = getSuggestedDurationSeconds(seconds, config);
  if (suggestedSeconds <= 0) return 0;
  return Math.max(0.01, Math.round((suggestedSeconds / 3600) * 100) / 100);
}
