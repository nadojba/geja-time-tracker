import { describe, expect, it } from 'vitest';
import { dailyReportSeries, summarizeReport } from '@/domain/reports';
import type { TimeSession } from '@/domain/types';
import type { RedmineTimeEntry } from '@/services/redmine/client';

const session = (spentOn: string, seconds: number): TimeSession => ({
  id: spentOn,
  accountId: 'account-1',
  issueId: 101,
  projectId: 1,
  userId: 7,
  startedAt: `${spentOn}T08:00:00.000Z`,
  endedAt: `${spentOn}T09:00:00.000Z`,
  durationSeconds: seconds,
  status: 'pending',
  description: '',
  activityId: null,
  spentOn,
  timeEntryId: null,
  submittedAt: null,
  segments: [],
  createdAt: `${spentOn}T08:00:00.000Z`,
  updatedAt: `${spentOn}T09:00:00.000Z`,
});

const entry = (spent_on: string, hours: number): RedmineTimeEntry => ({
  id: hours,
  issue: { id: 101 },
  project: { id: 1, name: 'Projeto A' },
  hours,
  spent_on,
  comments: '',
  activity: { id: 9, name: 'Desenvolvimento' },
});

describe('resumo de produtividade', () => {
  it('separa hoje, semana, mês e fontes local/servidor', () => {
    const result = summarizeReport({
      reference: new Date('2026-10-23T12:00:00.000Z'),
      sessions: [session('2026-10-23', 1800), session('2026-09-30', 3600)],
      serverEntries: [entry('2026-10-23', 2), entry('2026-10-01', 3)],
      period: 'today',
    });

    expect(result.localPendingHours).toBe(0.5);
    expect(result.serverHours).toBe(2);
    expect(result.byProject[0]).toMatchObject({ label: 'Projeto A', hours: 2 });
    expect(result.byIssue[0]).toMatchObject({ label: '#101', hours: 2 });

    expect(summarizeReport({
      reference: new Date('2026-10-23T12:00:00.000Z'),
      sessions: [session('2026-10-23', 1800), session('2026-09-30', 3600)],
      serverEntries: [entry('2026-10-23', 2), entry('2026-10-01', 3)],
      period: 'month',
    }).serverHours).toBe(5);

    const custom = summarizeReport({
      reference: new Date('2026-10-23T12:00:00.000Z'),
      sessions: [],
      serverEntries: [entry('2026-10-15', 2), entry('2026-10-23', 1)],
      period: 'custom',
      from: '2026-10-20',
      to: '2026-10-23',
    });
    expect(custom.serverHours).toBe(1);
    expect(custom.byActivity[0]).toMatchObject({ label: 'Desenvolvimento', hours: 1 });
  });

  it('cria pontos diários sem misturar servidor com pendente local', () => {
    const result = dailyReportSeries({
      reference: new Date('2026-10-23T12:00:00'),
      period: 'week',
      sessions: [session('2026-10-20', 1800)],
      serverEntries: [entry('2026-10-23', 2), entry('2026-10-20', 1)],
    });

    expect(result).toHaveLength(5);
    expect(result.find((point) => point.date === '2026-10-20')).toMatchObject({
      serverHours: 1,
      localPendingHours: 0.5,
    });
    expect(result.find((point) => point.date === '2026-10-23')).toMatchObject({
      serverHours: 2,
      localPendingHours: 0,
    });
  });
});
