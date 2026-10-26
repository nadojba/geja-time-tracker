export type TimerKeyboardCommand =
  | 'start-or-resume-timer'
  | 'pause-timer'
  | 'stop-timer';

export type TimerKeyboardAction = 'start' | 'resume' | 'pause' | 'stop' | 'noop';

export function resolveTimerKeyboardAction(
  command: TimerKeyboardCommand,
  activeStatus?: 'running' | 'paused',
): TimerKeyboardAction {
  if (command === 'start-or-resume-timer') {
    if (activeStatus === 'paused') return 'resume';
    return activeStatus === 'running' ? 'noop' : 'start';
  }
  if (command === 'pause-timer')
    return activeStatus === 'running' ? 'pause' : 'noop';
  return activeStatus ? 'stop' : 'noop';
}
