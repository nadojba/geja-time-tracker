import type { TimeSession } from '@/domain/types';
import type { RedmineTimeEntry } from '@/services/redmine/client';

export type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

export interface ReportBreakdown {
  label: string;
  hours: number;
}

export interface ReportSummary {
  localPendingHours: number;
  serverHours: number;
  byProject: ReportBreakdown[];
  byIssue: ReportBreakdown[];
  byActivity: ReportBreakdown[];
}

export interface DailyReportPoint {
  date: string;
  label: string;
  serverHours: number;
  localPendingHours: number;
}

// `spent_on` é uma data civil. Usar o fuso local evita deslocar o relatório
// para o dia anterior ou seguinte quando o usuário não está em UTC.
const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function periodStart(period: Exclude<ReportPeriod, 'custom'>, reference: Date): string {
  if (period === 'today') return dateKey(reference);
  if (period === 'month')
    return dateKey(new Date(reference.getFullYear(), reference.getMonth(), 1));
  const day = reference.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - daysSinceMonday);
  return dateKey(monday);
}

function inPeriod(value: string, input: { period: ReportPeriod; reference: Date; from?: string; to?: string }): boolean {
  const from = input.period === 'custom' ? input.from : periodStart(input.period, input.reference);
  const to = input.period === 'custom' ? input.to : dateKey(input.reference);
  if (!from || !to) return false;
  return value >= from && value <= to;
}

function periodBounds(input: {
  period: ReportPeriod;
  reference: Date;
  from?: string;
  to?: string;
}): { from: string; to: string } {
  return {
    from: input.period === 'custom' ? input.from ?? '' : periodStart(input.period, input.reference),
    to: input.period === 'custom' ? input.to ?? '' : dateKey(input.reference),
  };
}

const displayDate = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}`;
};

export function dailyReportSeries(input: {
  sessions: TimeSession[];
  serverEntries: RedmineTimeEntry[];
  period: ReportPeriod;
  reference: Date;
  from?: string;
  to?: string;
}): DailyReportPoint[] {
  const bounds = periodBounds(input);
  if (!bounds.from || !bounds.to || bounds.from > bounds.to) return [];

  const points: DailyReportPoint[] = [];
  const cursor = new Date(`${bounds.from}T12:00:00`);
  const end = new Date(`${bounds.to}T12:00:00`);
  while (cursor <= end) {
    const date = dateKey(cursor);
    points.push({ date, label: displayDate(date), serverHours: 0, localPendingHours: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  const byDate = new Map(points.map((point) => [point.date, point]));
  for (const entry of input.serverEntries) {
    const point = byDate.get(entry.spent_on);
    if (point) point.serverHours += entry.hours;
  }
  for (const session of input.sessions) {
    if (session.status !== 'pending' && session.status !== 'reconciliation_required') continue;
    const point = byDate.get(session.spentOn);
    if (point) point.localPendingHours += session.durationSeconds / 3600;
  }
  return points.map((point) => ({
    ...point,
    serverHours: Math.round(point.serverHours * 100) / 100,
    localPendingHours: Math.round(point.localPendingHours * 100) / 100,
  }));
}

export function summarizeReport(input: {
  sessions: TimeSession[];
  serverEntries: RedmineTimeEntry[];
  period: ReportPeriod;
  reference: Date;
  from?: string;
  to?: string;
}): ReportSummary {
  const localPendingHours = input.sessions
    .filter(
      (session) =>
        (session.status === 'pending' || session.status === 'reconciliation_required') &&
        inPeriod(session.spentOn, input),
    )
    .reduce((total, session) => total + session.durationSeconds / 3600, 0);
  const serverEntries = input.serverEntries.filter((entry) =>
    inPeriod(entry.spent_on, input),
  );
  const byProject = new Map<string, number>();
  const byIssue = new Map<string, number>();
  const byActivity = new Map<string, number>();
  for (const entry of serverEntries) {
    const project = entry.project?.name ?? 'Projeto não informado';
    const issue = entry.issue ? `#${entry.issue.id}` : 'Chamado não informado';
    byProject.set(project, (byProject.get(project) ?? 0) + entry.hours);
    byIssue.set(issue, (byIssue.get(issue) ?? 0) + entry.hours);
    const activity = entry.activity?.name ?? 'Atividade não informada';
    byActivity.set(activity, (byActivity.get(activity) ?? 0) + entry.hours);
  }
  const breakdown = (values: Map<string, number>): ReportBreakdown[] =>
    [...values.entries()]
      .map(([label, hours]) => ({ label, hours }))
      .sort((left, right) => right.hours - left.hours || left.label.localeCompare(right.label, 'pt-BR'));
  return {
    localPendingHours: Math.round(localPendingHours * 100) / 100,
    serverHours: Math.round(serverEntries.reduce((total, entry) => total + entry.hours, 0) * 100) / 100,
    byProject: breakdown(byProject),
    byIssue: breakdown(byIssue),
    byActivity: breakdown(byActivity),
  };
}
