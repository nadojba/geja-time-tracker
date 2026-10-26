export type TimerDurationFields = {
  hours: string;
  minutes: string;
  seconds: string;
};

export const splitTimerDuration = (durationSeconds: number): TimerDurationFields => {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
};

export const parseTimerDuration = (
  fields: TimerDurationFields,
): { seconds?: number; error?: string } => {
  const values = [fields.hours, fields.minutes, fields.seconds].map((value) =>
    value.trim(),
  );
  if (values.some((value) => !/^\d+$/.test(value)))
    return { error: 'Informe apenas números inteiros.' };

  const [hours, minutes, seconds] = values.map(Number);
  if (minutes > 59 || seconds > 59)
    return { error: 'Minutos e segundos devem ficar entre 0 e 59.' };

  return { seconds: hours * 3600 + minutes * 60 + seconds };
};
