import { describe, expect, it } from 'vitest';
import { defaultPreferences, getSuggestedDurationSeconds, getSuggestedEntryHours, roundDurationSeconds } from '@/domain/preferences';

describe('sugestão de arredondamento', () => {
  it('arredonda a sugestão para baixo, para o mais próximo e para cima', () => {
    const duration = 22 * 60;

    expect(roundDurationSeconds(duration, { ...defaultPreferences.roundToInterval, mode: 'down' })).toBe(15 * 60);
    expect(roundDurationSeconds(duration, { ...defaultPreferences.roundToInterval, mode: 'nearest' })).toBe(15 * 60);
    expect(roundDurationSeconds(duration, { ...defaultPreferences.roundToInterval, mode: 'up' })).toBe(30 * 60);
  });

  it('mantém a duração real quando o arredondamento está desativado', () => {
    const duration = 22 * 60;

    expect(roundDurationSeconds(duration, { ...defaultPreferences.roundToInterval, enabled: false })).toBe(duration);
  });

  it('não transforma uma sessão positiva curta em sugestão zero', () => {
    expect(getSuggestedDurationSeconds(4, { ...defaultPreferences.roundToInterval, mode: 'down' })).toBe(4);
    expect(getSuggestedDurationSeconds(4, { ...defaultPreferences.roundToInterval, mode: 'nearest' })).toBe(4);
    expect(getSuggestedDurationSeconds(0, defaultPreferences.roundToInterval)).toBe(0);
    expect(getSuggestedEntryHours(4, defaultPreferences.roundToInterval)).toBe(0.01);
  });
});
