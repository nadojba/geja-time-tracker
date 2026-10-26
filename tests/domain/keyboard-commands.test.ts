import { describe, expect, it } from 'vitest';
import { resolveTimerKeyboardAction } from '@/domain/keyboard-commands';

describe('comandos de teclado do timer', () => {
  it('inicia sem sessão e retoma apenas uma sessão pausada', () => {
    expect(resolveTimerKeyboardAction('start-or-resume-timer')).toBe('start');
    expect(resolveTimerKeyboardAction('start-or-resume-timer', 'paused')).toBe('resume');
    expect(resolveTimerKeyboardAction('start-or-resume-timer', 'running')).toBe('noop');
  });

  it('pausa somente timer em execução e para qualquer timer ativo', () => {
    expect(resolveTimerKeyboardAction('pause-timer', 'running')).toBe('pause');
    expect(resolveTimerKeyboardAction('pause-timer', 'paused')).toBe('noop');
    expect(resolveTimerKeyboardAction('stop-timer', 'paused')).toBe('stop');
    expect(resolveTimerKeyboardAction('stop-timer')).toBe('noop');
  });
});
