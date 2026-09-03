/**
 * Helpers de data e hora. Camada pura: nada de DOM, nada de localStorage.
 *
 * Datas circulam sempre como `YYYY-MM-DD` e horários como `HH:MM`, ambos em
 * horário local. Os dois formatos são ordenáveis por comparação de string, o
 * que dispensa converter para `Date` em quase toda a aplicação.
 */

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Converte uma data local em `YYYY-MM-DD` sem passar por UTC. */
export function toISODate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** `YYYY-MM-DD` → `Date` local (meia-noite). Evita o deslocamento de fuso do `new Date("2026-01-01")`. */
export function parseISODate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISODate(value);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Normaliza um horário para `HH:MM`. Aceita `9:5`, `09:05:00` e `9:05`, formatos
 * que aparecem em arquivos importados e que quebrariam a comparação por string.
 * Devolve `null` quando o valor não é um horário reconhecível.
 */
export function normalizeTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

export function shiftDate(date: string, days: number): string {
  const shifted = parseISODate(date);
  shifted.setDate(shifted.getDate() + days);
  return toISODate(shifted);
}

/** Diferença em dias inteiros entre duas datas locais. */
export function daysBetween(from: string, to: string): number {
  const start = parseISODate(from).getTime();
  const end = parseISODate(to).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(date: string): number {
  return parseISODate(date).getDay();
}

export function isWeekday(date: string): boolean {
  const day = weekdayOf(date);
  return day >= 1 && day <= 5;
}

/** Segunda-feira da semana que contém `date`. A semana da agenda começa na segunda. */
export function startOfWeek(date: string): string {
  const weekday = weekdayOf(date);
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return shiftDate(date, offset);
}

/** Os sete dias da semana de `date`, de segunda a domingo. */
export function weekDays(date: string): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_unused, index) => shiftDate(monday, index));
}

export function formatLongDate(date: string): string {
  const label = dateFormatter.format(parseISODate(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDate(date: string): string {
  return shortDateFormatter.format(parseISODate(date));
}

export function formatWeekday(date: string): string {
  return weekdayFormatter.format(parseISODate(date)).replace(".", "");
}

export function formatDayOfMonth(date: string): string {
  return pad(parseISODate(date).getDate());
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function minutesOf(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function durationInMinutes(startTime: string, endTime: string): number {
  return minutesOf(endTime) - minutesOf(startTime);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours}h${pad(rest)}`;
  if (hours > 0) return `${hours}h`;
  return `${rest}min`;
}
