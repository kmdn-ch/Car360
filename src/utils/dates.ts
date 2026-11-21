export function parseLocalDate(str: string): Date {
  const [datePart, timePart] = str.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (timePart) {
    const [h, mi] = timePart.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
  }
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalDateTimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toLocalDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDaysLocal(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    0,
    0
  );
}

export function addMonthsLocal(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(d.getDate(), lastDay),
    d.getHours(),
    d.getMinutes(),
    0,
    0
  );
}

export function diffDaysLocal(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function diffHours(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

export function getContractMonth(
  startDateStr: string,
  refDate: Date,
  durationMonths = 60
): number {
  const s = parseLocalDate(startDateStr);
  if (refDate < s) return 0;
  const m =
    (refDate.getFullYear() - s.getFullYear()) * 12 +
    (refDate.getMonth() - s.getMonth()) +
    (refDate.getDate() >= s.getDate() ? 1 : 0);
  return Math.max(1, Math.min(durationMonths, m));
}

export function endOfContractMonthDate(
  startDateStr: string,
  month: number
): Date {
  const s = parseLocalDate(startDateStr);
  const plusM = addMonthsLocal(s, month);
  return addDaysLocal(plusM, -1);
}
