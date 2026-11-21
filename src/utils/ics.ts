import { parseLocalDate } from './dates';
import { isNativeAndroid, shareTextFile } from './nativeFiles';

function toUtcIcsStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcsContent(opts: {
  title: string;
  description: string;
  startLocal: string; // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'
  durationMinutes?: number;
}): string {
  const raw = opts.startLocal.includes('T')
    ? opts.startLocal
    : `${opts.startLocal}T09:00`;
  const start = parseLocalDate(raw);
  const end = new Date(
    start.getTime() + (opts.durationMinutes ?? 60) * 60_000
  );
  const nowStamp = toUtcIcsStamp(new Date());
  const uid = `car360-${start.getTime()}@car360.local`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Car360 PWA//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${toUtcIcsStamp(start)}`,
    `DTEND:${toUtcIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText(opts.title)}`,
    `DESCRIPTION:${escapeIcsText(opts.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel J-1',
    'TRIGGER:-P1D',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel H-1',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcsEvent(opts: {
  title: string;
  description: string;
  startLocal: string;
  filename: string;
  durationMinutes?: number;
}): void {
  const content = buildIcsContent(opts);
  if (isNativeAndroid()) {
    void shareTextFile(content, opts.filename, opts.title);
    return;
  }
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
