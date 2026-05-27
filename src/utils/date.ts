export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesUntil(time: string, from = new Date()): number {
  const [hours, minutes] = time.split(":").map(Number);
  const target = new Date(from);
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= from.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return Math.max(0, Math.floor((target.getTime() - from.getTime()) / 60000));
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} 分钟`;
  }
  return `${hours} 小时 ${minutes} 分钟`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
