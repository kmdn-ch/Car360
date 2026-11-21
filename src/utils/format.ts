import { diffDaysLocal, parseLocalDate } from './dates';

function withSwissApostrophe(intStr: string): string {
  const neg = intStr.startsWith('-');
  const digits = neg ? intStr.slice(1) : intStr;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return neg ? `-${grouped}` : grouped;
}

export function formatChf(amount: number, showSign = false): string {
  if (!Number.isFinite(amount)) return 'CHF 0.–';
  const rounded = Math.round(amount * 100) / 100;
  const abs = Math.abs(rounded);
  const isWhole = Math.abs(abs - Math.round(abs)) < 0.005;
  const sign = rounded < -0.005 ? '-' : showSign && rounded > 0.005 ? '+' : '';
  if (isWhole) {
    const intPart = withSwissApostrophe(String(Math.round(abs)));
    return `${sign}CHF ${intPart}.–`;
  }
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return `${sign}CHF ${withSwissApostrophe(intPart)}.${decPart}`;
}

export function formatNumberCH(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = withSwissApostrophe(intPart);
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export function formatKm(km: number, showSign = false): string {
  const rounded = Math.round(km);
  const sign = showSign && rounded > 0 ? '+' : '';
  return `${sign}${formatNumberCH(rounded, 0)} km`;
}

export function formatDateCH(dateStr: string): string {
  if (!dateStr) return 'À compléter';
  const d = parseLocalDate(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const WEEKDAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export function formatDateTimeCH(dateTimeStr: string): string {
  if (!dateTimeStr) return 'À compléter';
  const d = parseLocalDate(dateTimeStr);
  const wd = WEEKDAYS_SHORT[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${wd} ${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export function formatRelativeDay(targetStr: string, now: Date): string {
  const target = parseLocalDate(targetStr);
  const days = diffDaysLocal(now, target);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days === -1) return 'Hier';
  if (days > 1) return `Dans ${days} j`;
  return `En retard de ${Math.abs(days)} j`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
