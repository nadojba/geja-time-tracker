import { describe, expect, it } from 'vitest';
import { createTimeReportHtml } from '@/utils/time-report';
import { createTimeReportCsv } from '@/utils/time-report-csv';
import type { TimeSession } from '@/domain/types';
import type { RedmineTimeEntry } from '@/services/redmine/client';
import { parseDescriptionInline, parseRedmineDescription } from '@/utils/redmine-description';

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

  it('mantém apontamentos do Redmine separados das sessões locais', () => {
    const serverEntries: RedmineTimeEntry[] = [
      { id: 9, issue: { id: 101758 }, hours: 2, spent_on: '2026-10-22', comments: 'Confirmado' },
    ];
    const html = createTimeReportHtml({
      sessions: [session('pending', 1800)],
      serverEntries,
      generatedAt: new Date('2026-10-22T10:00:00.000Z'),
    });

    expect(html).toContain('Tempo confirmado no Redmine');
    expect(html).toContain('02:00:00');
    expect(html).toContain('As fontes não foram somadas');
  });

  it('exporta CSV com as duas origens e escapa aspas', () => {
    const csv = createTimeReportCsv({
      sessions: [session('pending', 1800)],
      serverEntries: [{
        id: 9,
        issue: { id: 101758 },
        hours: 2,
        spent_on: '2026-10-22',
        comments: 'A"pontamento',
      }],
    });

    expect(csv).toContain('"Origem";"Data";"Chamado"');
    expect(csv).toContain('"Redmine";"2026-10-22";"#101758"');
    expect(csv).toContain('"Pendente local"');
    expect(csv).toContain('A""pontamento');
  });

  it('interpreta headings, listas Textile e estilos inline do Redmine', () => {
    const blocks = parseRedmineDescription('h3. Componentes\n\n* *1.* Texto\n** *1.1.* Título\n# Item ordenado');
    expect(blocks).toEqual([
      { kind: 'heading', level: 3, text: 'Componentes' },
      { kind: 'list', ordered: false, items: [{ level: 1, text: '*1.* Texto' }, { level: 2, text: '*1.1.* Título' }] },
      { kind: 'list', ordered: true, items: [{ level: 1, text: 'Item ordenado' }] },
    ]);
    expect(parseDescriptionInline('*negrito* _itálico_ +sublinhado+')).toEqual([
      { kind: 'strong', value: 'negrito' },
      { kind: 'text', value: ' ' },
      { kind: 'emphasis', value: 'itálico' },
      { kind: 'text', value: ' ' },
      { kind: 'underline', value: 'sublinhado' },
    ]);
  });
});
