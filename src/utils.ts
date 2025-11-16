export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours();
  const mins = date.getMinutes();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  if (!isToday) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month} ${timeStr}`;
  }
  return timeStr;
}
