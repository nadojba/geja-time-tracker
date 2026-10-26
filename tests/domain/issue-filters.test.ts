import { describe, expect, it } from 'vitest';
import type { RedmineIssue } from '@/services/redmine/client';
import {
  filterIssues,
  groupIssues,
  sortIssues,
} from '@/domain/issue-filters';

const issue = (overrides: Partial<RedmineIssue>): RedmineIssue => ({
  id: 100,
  subject: 'Chamado base',
  project: { id: 1, name: 'Projeto A' },
  status: { id: 1, name: 'Novo' },
  priority: { id: 3, name: 'Normal' },
  ...overrides,
});

describe('filtros e agrupamento de chamados', () => {
  it('pesquisa por número ou assunto e aplica filtros estruturados', () => {
    const issues = [
      issue({ id: 101, subject: 'Login', project: { id: 1, name: 'A' } }),
      issue({ id: 202, subject: 'Relatório', project: { id: 2, name: 'B' }, status: { id: 2, name: 'Fechado' } }),
    ];

    expect(filterIssues(issues, { text: '101' })).toEqual([issues[0]]);
    expect(filterIssues(issues, { text: 'relatório', statusId: '2' })).toEqual([issues[1]]);
    expect(filterIssues(issues, { projectId: '1', statusId: '2' })).toEqual([]);
  });

  it('ordena por prioridade e mantém o chamado ativo no topo', () => {
    const issues = [
      issue({ id: 1, priority: { id: 2, name: 'Baixa' } }),
      issue({ id: 2, priority: { id: 5, name: 'Urgente' } }),
      issue({ id: 3, priority: { id: 3, name: 'Normal' } }),
    ];

    expect(sortIssues(issues, { sortByPriority: true, activeIssueId: 1 }).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('agrupa por projeto e versão quando solicitado', () => {
    const issues = [
      issue({ id: 1, fixed_version: { id: 10, name: 'v2' } }),
      issue({ id: 2, fixed_version: { id: 11, name: 'v3' } }),
      issue({ id: 3 }),
    ];

    expect(groupIssues(issues, true).map((group) => group.label)).toEqual([
      'Projeto A · v2',
      'Projeto A · v3',
      'Projeto A · Sem versão',
    ]);
  });

  it('filtra por chamados com pendências e trabalhados hoje', () => {
    const issues = [
      issue({ id: 101, subject: 'A' }),
      issue({ id: 102, subject: 'B' }),
      issue({ id: 103, subject: 'C' }),
    ];

    expect(
      filterIssues(issues, { pendingIssueIds: new Set([101, 103]) }).map(
        (item) => item.id,
      ),
    ).toEqual([101, 103]);
    expect(
      filterIssues(issues, { workedTodayIssueIds: new Set([102]) }).map(
        (item) => item.id,
      ),
    ).toEqual([102]);
  });
});
