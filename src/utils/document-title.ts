const timerPrefix = /^\(\d{2}:\d{2}:\d{2}\)\s+/;

const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainingSeconds}`;
};

export function getTimerDocumentTitle(
  originalTitle: string,
  seconds: number,
  active: boolean,
): string {
  const baseTitle = originalTitle.replace(timerPrefix, '');
  return active ? `(${formatDuration(seconds)}) ${baseTitle}` : baseTitle;
}
