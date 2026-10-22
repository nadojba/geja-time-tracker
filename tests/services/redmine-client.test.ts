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

  it('converte erros HTTP em erro tipado sem expor a chave', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(new RedmineClient('https://redmine.example', 'top-secret', fetcher).currentUser()).rejects.toMatchObject({ status: 401 });
    try { await new RedmineClient('https://redmine.example', 'top-secret', fetcher).currentUser(); } catch (error) { expect(error).toBeInstanceOf(RedmineApiError); expect((error as Error).message).not.toContain('top-secret'); }
  });
});
