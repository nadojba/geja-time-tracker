import { describe, expect, it, vi } from 'vitest';
import { RedmineApiError, RedmineClient } from '@/services/redmine/client';

describe('RedmineClient', () => {
  it('envia API Key e pagina até total_count', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ total_count: 2, projects: [{ id: 1, name: 'A', identifier: 'a' }] }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ total_count: 2, projects: [{ id: 2, name: 'B', identifier: 'b' }] }), { status: 200 }));
    const projects = await new RedmineClient('https://redmine.example', 'secret', fetcher).projects();
    expect(projects).toHaveLength(2);
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ 'X-Redmine-API-Key': 'secret' });
    expect(fetcher.mock.calls[1][0]).toContain('offset=1');
  });

  it('consulta chamados atribuídos ao usuário quando nenhum escopo é informado', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ total_count: 0, issues: [] }), { status: 200 }));
    await new RedmineClient('https://redmine.example', 'secret', fetcher).issues();
    expect(fetcher.mock.calls[0][0]).toContain('assigned_to_id=me');
  });

  it('converte erros HTTP em erro tipado sem expor a chave', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(new RedmineClient('https://redmine.example', 'top-secret', fetcher).currentUser()).rejects.toMatchObject({ status: 401 });
    try { await new RedmineClient('https://redmine.example', 'top-secret', fetcher).currentUser(); } catch (error) { expect(error).toBeInstanceOf(RedmineApiError); expect((error as Error).message).not.toContain('top-secret'); }
  });

  it('pagina apontamentos do usuário e preserva filtros de período', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_count: 2,
            time_entries: [{ id: 1, hours: 1, spent_on: '2026-10-23', comments: '' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_count: 2,
            time_entries: [{ id: 2, hours: 2, spent_on: '2026-10-24', comments: '' }],
          }),
          { status: 200 },
        ),
      );

    const entries = await new RedmineClient(
      'https://redmine.example',
      'secret',
      fetcher,
    ).timeEntries({ user_id: 7, from: '2026-10-23', to: '2026-10-24' });

    expect(entries).toHaveLength(2);
    expect(fetcher.mock.calls[0][0]).toContain('user_id=7');
    expect(fetcher.mock.calls[0][0]).toContain('from=2026-10-23');
    expect(fetcher.mock.calls[1][0]).toContain('offset=1');
  });

  it('filtra apontamentos por chamado', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ total_count: 0, time_entries: [] }), { status: 200 }));
    await new RedmineClient('https://redmine.example', 'secret', fetcher).timeEntries({ user_id: 7, issue_id: 101758 });
    expect(fetcher.mock.calls[0][0]).toContain('issue_id=101758');
  });

  it('cria um chamado com os campos informados', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          issue: {
            id: 101999,
            subject: 'Novo chamado',
            project: { id: 7, name: 'Projeto' },
          },
        }),
        { status: 201 },
      ),
    );

    const result = await new RedmineClient(
      'https://redmine.example',
      'secret',
      fetcher,
    ).createIssue({
      project_id: 7,
      subject: 'Novo chamado',
      description: 'Descrição',
      tracker_id: 2,
      status_id: 1,
      priority_id: 4,
    });

    expect(result.issue.id).toBe(101999);
    expect(fetcher).toHaveBeenCalledWith(
      'https://redmine.example/issues.json',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          issue: {
            project_id: 7,
            subject: 'Novo chamado',
            description: 'Descrição',
            tracker_id: 2,
            status_id: 1,
            priority_id: 4,
          },
        }),
      }),
    );
  });
});
