import { describe, expect, it } from 'vitest';
import { changelog, resolveLanguage, setLanguage, translate } from '@/i18n';

describe('i18n', () => {
  it('resolve o idioma automático para inglês quando o navegador está em inglês', () => {
    const original = navigator.language;
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' });
    expect(resolveLanguage('auto')).toBe('en');
    Object.defineProperty(navigator, 'language', { configurable: true, value: original });
  });

  it('troca o texto da interface entre português e inglês', () => {
    setLanguage('pt-BR');
    expect(translate('newIssue')).toBe('Novo chamado');
    setLanguage('en');
    expect(translate('newIssue')).toBe('New issue');
    setLanguage('pt-BR');
  });

  it('mantém as novidades versionadas nos dois idiomas', () => {
    expect(changelog[0].version).toBe('0.1.5');
    expect(changelog[0].changes['pt-BR'].length).toBeGreaterThan(0);
    expect(changelog[0].changes.en.length).toBeGreaterThan(0);
  });
});
