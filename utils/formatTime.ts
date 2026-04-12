export function formatDaysSinceLastDone(days: number | null): string | null {
  if (days === null) {
    return null;
  }

  if (days === 1) {
    return 'gestern';
  }

  if (days === 2) {
    return 'vorgestern';
  }

  if (days <= 6) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return weekdays[date.getDay()];
  }

  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return 'vor einer Woche';
  }

  if (weeks < 4) {
    return `vor ${weeks} Wochen`;
  }

  const months = Math.floor(days / 30);
  if (months === 1) {
    return 'vor 1 Monat';
  }

  return `vor ${months} Monaten`;
}

export function formatRelativeTime(isoString: string): string {
  return formatTime(isoString);
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'heute';
  }

  if (diffDays === 1) {
    return 'gestern';
  }

  if (diffDays === 2) {
    return 'vorgestern';
  }

  if (diffDays <= 6) {
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return weekdays[date.getDay()];
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}
