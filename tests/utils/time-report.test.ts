import { describe, expect, it } from 'vitest';
import { createTimeReportHtml } from '@/utils/time-report';
import type { TimeSession } from '@/domain/types';

const session = (status: TimeSession['status'], durationSeconds: number): TimeSession => ({
  id: `${status}-1`, accountId: 'account-1', issueId: 101758, projectId: 12, userId: 7,
  startedAt: '2026-10-22T08:00:00.000Z', endedAt: '2026-10-22T09:00:00.000Z', durationSeconds, status,
  description: 'Implementação & revisão', activityId: 9, spentOn: '2026-10-22', timeEntryId: status === 'submitted' ? 42 : null,
  submittedAt: status === 'submitted' ? '2026-10-22T09:00:00.000Z' : null, segments: [], createdAt: '2026-10-22T08:00:00.000Z', updatedAt: '2026-10-22T09:00:00.000Z',
});

describe('relatório de horas', () => {
  it('separa totais pendentes e lançados e escapa conteúdo da sessão', () => {
    const html = createTimeReportHtml({ sessions: [session('pending', 1800), session('submitted', 3600)], accountName: 'Usuário <teste>', generatedAt: new Date('2026-10-22T10:00:00.000Z') });

    expect(html).toContain('01:30:00');
    expect(html).toContain('00:30:00');
    expect(html).toContain('Lançada');
    expect(html).toContain('Pendente');
    expect(html).toContain('Implementação &amp; revisão');
    expect(html).toContain('Usuário &lt;teste&gt;');
  });
});
