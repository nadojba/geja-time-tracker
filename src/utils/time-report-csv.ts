import type { TimeSession } from '@/domain/types';
import type { RedmineTimeEntry } from '@/services/redmine/client';

const csvCell = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`;

export function createTimeReportCsv(input: {
  sessions: TimeSession[];
  serverEntries: RedmineTimeEntry[];
}): string {
  const rows = [
    ['Origem', 'Data', 'Chamado', 'Projeto', 'Horas', 'Atividade', 'Descrição'],
    ...input.serverEntries.map((entry) => [
      'Redmine',
      entry.spent_on,
      entry.issue ? `#${entry.issue.id}` : '',
      entry.project?.name ?? '',
      entry.hours.toFixed(2),
      entry.activity?.name ?? '',
      entry.comments,
    ]),
    ...input.sessions.map((session) => [
      'Pendente local',
      session.spentOn,
      `#${session.issueId}`,
      `#${session.projectId}`,
      (session.durationSeconds / 3600).toFixed(2),
      session.activityId ? String(session.activityId) : '',
      session.description,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}\n`;
}

export function downloadTimeReportCsv(
  input: Parameters<typeof createTimeReportCsv>[0],
  filename = 'geja-time-tracker-relatorio.csv',
): void {
  const blob = new Blob([createTimeReportCsv(input)], {
    type: 'text/csv;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
