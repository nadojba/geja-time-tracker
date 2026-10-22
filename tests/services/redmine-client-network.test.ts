import { describe, expect, it, vi } from 'vitest';
import { RedmineClient } from '@/services/redmine/client';

describe('erros de rede do RedmineClient', () => {
  it('preserva o contexto do fetch padrão do worker', async () => {
    const nativeFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: 1 } }), { status: 200 }));
    vi.stubGlobal('fetch', nativeFetch);
    await new RedmineClient('https://redmine.example', 'secret').currentUser();
    expect(nativeFetch).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('orienta a autorizar o domínio quando o Chrome bloqueia o fetch', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(new RedmineClient('https://redmine.example', 'secret', fetcher).currentUser()).rejects.toThrow('Chrome bloqueou o acesso');
  });
});
