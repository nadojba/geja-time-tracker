import { describe, expect, it } from 'vitest';
import {
  parseTimerDuration,
  splitTimerDuration,
} from '@/utils/timer-duration';

describe('edição da duração do timer', () => {
  it('divide segundos em campos HH MM SS', () => {
    expect(splitTimerDuration(3725)).toEqual({
      hours: '01',
      minutes: '02',
      seconds: '05',
    });
  });

  it('converte campos válidos em segundos', () => {
    expect(
      parseTimerDuration({ hours: '1', minutes: '02', seconds: '05' }),
    ).toEqual({ seconds: 3725 });
  });

  it('rejeita minutos e segundos fora do intervalo', () => {
    expect(
      parseTimerDuration({ hours: '1', minutes: '60', seconds: '00' }),
    ).toEqual({ error: 'Minutos e segundos devem ficar entre 0 e 59.' });
  });

  it('rejeita valores que não são inteiros', () => {
    expect(
      parseTimerDuration({ hours: '1.5', minutes: '00', seconds: '00' }),
    ).toEqual({ error: 'Informe apenas números inteiros.' });
  });
});
