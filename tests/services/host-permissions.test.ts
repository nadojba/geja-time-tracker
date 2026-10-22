import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertRedmineHostPermission, isInsecureRedmineUrl, normalizeRedmineUrl, redmineOriginPattern } from '@/services/permissions/host';

describe('permissões de host Redmine', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserva porta e subdiretório, mas solicita permissão somente para a origem', () => {
    const url = 'https://redmine.example:8443/redmine/';

    expect(normalizeRedmineUrl(url)).toBe('https://redmine.example:8443/redmine');
    expect(redmineOriginPattern(url)).toBe('https://redmine.example:8443/*');
  });

  it('identifica HTTP como conexão insegura', () => {
    expect(isInsecureRedmineUrl('http://redmine.example/redmine')).toBe(true);
    expect(isInsecureRedmineUrl('https://redmine.example/redmine')).toBe(false);
  });

  it('não permite chamadas quando a origem foi recusada ou revogada', async () => {
    const contains = vi.fn().mockResolvedValue(false);
    vi.stubGlobal('chrome', { permissions: { contains } });

    await expect(assertRedmineHostPermission('https://redmine.example/redmine')).rejects.toThrow('permissão');
    expect(contains).toHaveBeenCalledWith({ origins: ['https://redmine.example/*'] });
  });

  it('permite a origem quando o Chrome confirma a concessão', async () => {
    vi.stubGlobal('chrome', { permissions: { contains: vi.fn().mockResolvedValue(true) } });

    await expect(assertRedmineHostPermission('https://redmine.example:8443/redmine')).resolves.toBeUndefined();
  });
});
