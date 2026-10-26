import { describe, expect, it } from 'vitest';
import { getTimerDocumentTitle } from '@/utils/document-title';

describe('título da página com timer', () => {
  it('mostra a duração somente quando o chamado possui sessão ativa', () => {
    expect(getTimerDocumentTitle('Redmine', 932, true)).toBe(
      '(00:15:32) Redmine',
    );
    expect(getTimerDocumentTitle('(00:15:32) Redmine', 0, false)).toBe(
      'Redmine',
    );
  });
});
