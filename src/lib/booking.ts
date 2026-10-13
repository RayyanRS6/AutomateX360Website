// Booking logic for the UI.
//
// Availability is your GoHighLevel calendar's free times (loaded via
// api/slots.ts). When GHL isn't connected, or in plain `npm run dev`, it falls
// back to your working hours in YOUR time zone (config.availability in
// src/content.ts). Every open slot is a fixed moment
// in time; each visitor sees those moments converted into their own time zone,
// which is read from their device settings (no permission prompt) and can be
// changed in the booking card. Bookings are sent to api/book.ts.
//
// No date library: time-zone maths uses the browser's built-in Intl API.

import { config } from '../content';

export type BudgetId = 'under' | 'mid' | 'high';

export type BookingRequest = {
  budget: BudgetId;
  /** What they typed when they picked "Under $2,000" (empty otherwise). */
  budgetAmount: string;
  website: string | null;
  start: Date;
  durationMin: number;
  name: string;
  email: string;
  phone: string;
  business: string;
  notes: string;
  /** The visitor's chosen time zone (IANA name, e.g. "Asia/Dubai"). */
  timeZone: string;
};

export const CALL_MINUTES = config.callMinutes;
const DAY_MS = 86_400_000;

/* ---------------- Time zones ---------------- */

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The visitor's time zone, from their device's own clock settings. Browsers
 * expose this without asking for permission (unlike location). Falls back to
 * the configured default (Eastern Time) if it can't be read.
 */
export function detectTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== 'Etc/Unknown' && isValidTimeZone(tz)) return tz;
  } catch {
    // fall through
  }
  return config.defaultVisitorTimeZone;
}

type Parts = { y: number; m: number; d: number; h: number; mi: number };
const partFormatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar date and wall-clock time of an instant in a time zone (m is 0-based). */
function partsIn(date: Date, timeZone: string): Parts {
  let f = partFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    partFormatters.set(timeZone, f);
  }
  const get: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') get[p.type] = Number(p.value);
  return { y: get.year, m: get.month - 1, d: get.day, h: get.hour % 24, mi: get.minute };
}

/** The instant when the wall clock in `timeZone` shows y-m-d h:mi (days may overflow). */
function zonedTime(y: number, m: number, d: number, h: number, mi: number, timeZone: string) {
  const wanted = Date.UTC(y, m, d, h, mi);
  let t = wanted;
  // Two passes settle the zone's offset, including across DST changes.
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(t), timeZone);
    t += wanted - Date.UTC(p.y, p.m, p.d, p.h, p.mi);
  }
  return new Date(t);
}

/** The calendar date of an instant in a time zone, as a local-midnight Date (only y/m/d matter). */
export function dateIn(instant: Date, timeZone: string) {
  const p = partsIn(instant, timeZone);
  return new Date(p.y, p.m, p.d);
}

/** "GMT+4"-style offset of a zone at a given moment. */
export function zoneOffset(timeZone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

/** Readable name of a zone, e.g. "Gulf Standard Time" or "Eastern Daylight Time". */
export function zoneName(timeZone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: 'long' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** "Dubai" from "Asia/Dubai", "New York" from "America/New_York". */
export function zoneCity(timeZone: string) {
  return timeZone.split('/').pop()!.replace(/_/g, ' ');
}

/* ---------------- Calendar dates (plain y/m/d, shown in the visitor's zone) ---------------- */

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Small deterministic hash, used for calendar-file UIDs. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ---------------- Availability ---------------- */

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Free times from your GoHighLevel calendar (via api/slots.ts). When set, they
 * replace the hours in config.availability, so booked times never show.
 */
let remoteSlots: Date[] | null = null;
/** GHL's minimum scheduling notice: a time drops off as soon as GHL would refuse it. */
let remoteNoticeMs = 0;
let slotsVersion = 0;

/**
 * `npm run dev` has no server functions: Vite answers /api/* with a 404 or the
 * function's source file. On Vercel these paths are the real functions.
 */
const noDevServer = (res: Response) =>
  import.meta.env.DEV && (res.status === 404 || !(res.headers.get('content-type') ?? '').includes('application/json'));

/** Loads your free times from GHL. Resolves to where the times came from. */
export async function fetchAvailability(fresh = false): Promise<'ghl' | 'local'> {
  const res = await fetch(`/api/slots${fresh ? `?t=${Date.now()}` : ''}`, { headers: { Accept: 'application/json' } });
  // No server in dev: use the configured hours.
  if (noDevServer(res)) {
    remoteSlots = null;
    slotsVersion++;
    return 'local';
  }
  if (!res.ok) throw new Error(`Availability failed (${res.status})`);
  const data = (await res.json()) as { source?: string; slots?: string[]; noticeMinutes?: number };
  remoteSlots = data.source === 'ghl' && Array.isArray(data.slots) ? data.slots.map((s) => new Date(s)).filter((d) => !Number.isNaN(d.getTime())) : null;
  remoteNoticeMs = Math.max(0, Number(data.noticeMinutes) || 0) * 60_000;
  slotsVersion++;
  return remoteSlots ? 'ghl' : 'local';
}

let slotCache: { key: string; slots: Date[] } | null = null;

/**
 * Every open slot, as exact moments in time. With GHL connected: exactly your
 * GHL free times (GHL's own notice, booking window and existing bookings
 * decide them); as the clock moves, a time drops off once it is inside GHL's
 * minimum notice, the moment GHL would stop accepting it. Otherwise:
 * your shifts from config.availability in your own time zone (a shift that
 * ends after midnight belongs to the day it starts), from now plus the minimum
 * notice to the end of the booking window.
 */
export function openSlots(now = new Date()): Date[] {
  const key = `${Math.floor(now.getTime() / 60_000)}|${slotsVersion}`;
  if (slotCache?.key === key) return slotCache.slots;

  if (remoteSlots) {
    const slots = remoteSlots.filter((s) => s.getTime() > now.getTime() + remoteNoticeMs);
    slotCache = { key, slots };
    return slots;
  }

  const { timeZone, days, start, end, slotMinutes } = config.availability;
  const startMin = toMinutes(start);
  let endMin = toMinutes(end);
  if (endMin <= startMin) endMin += 24 * 60; // overnight shift
  const earliest = now.getTime() + config.minNoticeHours * 3_600_000;
  const latest = now.getTime() + config.bookingDaysAhead * DAY_MS;

  const today = partsIn(now, timeZone);
  const slots: Date[] = [];
  // Start a day early so the tail of last night's shift is included.
  for (let i = -1; i <= config.bookingDaysAhead + 1; i++) {
    const weekday = new Date(Date.UTC(today.y, today.m, today.d + i)).getUTCDay();
    if (!days.includes(weekday)) continue;
    for (let min = startMin; min + CALL_MINUTES <= endMin; min += slotMinutes) {
      const at = zonedTime(today.y, today.m, today.d + i, Math.floor(min / 60), min % 60, timeZone);
      if (at.getTime() >= earliest && at.getTime() <= latest) slots.push(at);
    }
  }
  slots.sort((a, b) => a.getTime() - b.getTime());
  slotCache = { key, slots };
  return slots;
}

let dayCache: { key: string; byDay: Map<string, Date[]> } | null = null;

/** Open slots grouped by calendar day in the visitor's zone (cached per minute, zone and data). */
function slotsByDay(now: Date, timeZone: string) {
  const key = `${Math.floor(now.getTime() / 60_000)}|${timeZone}|${slotsVersion}`;
  if (dayCache?.key === key) return dayCache.byDay;
  const byDay = new Map<string, Date[]>();
  for (const s of openSlots(now)) {
    const k = dayKey(dateIn(s, timeZone));
    const list = byDay.get(k);
    if (list) list.push(s);
    else byDay.set(k, [s]);
  }
  dayCache = { key, byDay };
  return byDay;
}

/** Hour of the day (0–23) of an instant in a time zone. */
export function hourIn(d: Date, timeZone: string) {
  return partsIn(d, timeZone).h;
}

/** Open slots on a calendar day, where the day is read in the visitor's time zone. */
export function getSlots(day: Date, now: Date, timeZone: string): Date[] {
  return slotsByDay(now, timeZone).get(dayKey(day)) ?? [];
}

export function isBookable(day: Date, now: Date, timeZone: string) {
  return getSlots(day, now, timeZone).length > 0;
}

/** Whether a picked slot is still open at time `now` (independent of time zone). */
export function isSlotOpen(slot: Date, now = new Date()) {
  return openSlots(now).some((s) => s.getTime() === slot.getTime());
}

/** First and last calendar day (in the visitor's zone) that the calendar can show. */
export function bookingWindow(now: Date, timeZone: string) {
  const slots = openSlots(now);
  const first = slots.length ? dateIn(slots[0], timeZone) : dateIn(now, timeZone);
  const last = slots.length ? dateIn(slots[slots.length - 1], timeZone) : first;
  return { first, last };
}

export function firstBookableDay(now: Date, timeZone: string) {
  return bookingWindow(now, timeZone).first;
}

/* ---------------- Formatting ---------------- */

export const fmt = {
  /** A slot's time of day in the visitor's zone. */
  time: (d: Date, timeZone: string) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone }),
  /** A slot's date in the visitor's zone. */
  slotDay: (d: Date, timeZone: string) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone }),
  /** A calendar day (local-midnight Date). */
  dayLong: (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
  month: (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
};

/** Monday-first weekday initials in the visitor's language. */
export function weekdayLabels() {
  const monday = new Date(2024, 0, 1); // a Monday
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i).toLocaleDateString(undefined, { weekday: 'short' }));
}

/** Calendar cells for a month view, Monday first, padded with nulls. */
export function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function normaliseUrl(raw: string) {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

// Domain labels: letters and marks in any script (müller-bäckerei.de,
// हिन्दी.भारत), digits and inner hyphens.
const LABEL = '[\\p{L}\\p{M}\\p{N}](?:[\\p{L}\\p{M}\\p{N}-]*[\\p{L}\\p{M}\\p{N}])?';
const TLD = '\\p{L}[\\p{L}\\p{M}\\p{N}-]*[\\p{L}\\p{M}\\p{N}]';
const URL_RE = new RegExp(`^(?:${LABEL}\\.)+${TLD}\\.?(?::\\d{1,5})?(?:[/?#]\\S*)?$`, 'u');
const EMAIL_RE = new RegExp(`^[^\\s@]+@(?:${LABEL}\\.)+${TLD}$`, 'u');

export function looksLikeUrl(raw: string) {
  return URL_RE.test(raw.trim().replace(/^https?:\/\//i, ''));
}

export function looksLikeEmail(raw: string) {
  return EMAIL_RE.test(raw.trim());
}

/** Folds an iCalendar line at 75 octets without splitting a UTF-8 character (RFC 5545 §3.1). */
function foldIcsLine(line: string) {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length ? 74 : 75; // continuation lines start with a space
    if (bytes + n > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

/** An .ics file the visitor can add to any calendar app. */
export function buildIcs(b: Pick<BookingRequest, 'start' | 'durationMin' | 'name' | 'business'>, brandName: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(b.start.getTime() + b.durationMin * 60_000);
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${brandName}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${stamp(b.start)}-${hash(b.name + b.business)}@${brandName.toLowerCase()}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(b.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${brandName} × ${b.business || b.name}: website call`)}`,
    `DESCRIPTION:${esc(`${b.durationMin}-minute call with ${brandName} about your new website.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function downloadIcs(ics: string, filename: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sends the booking to the site's own server function (api/book.ts), which
 * books it in GoHighLevel, saves it to the Google Sheet and sends it to
 * WhatsApp. No secrets live in the browser: they're in Vercel and in the
 * sheet's script.
 * `honeypot` is a hidden field people never see; bots fill it in.
 *
 * Throws on failure, so the form shows its error message and the visitor can
 * try again instead of believing they're booked.
 */
export async function submitBooking(req: BookingRequest, honeypot = ''): Promise<{ ok: true }> {
  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, start: req.start.toISOString(), hp: honeypot }),
  });
  // No server in dev; use `vercel dev` to test the real send. Plain Vite dev
  // lets the flow finish so the UI can still be worked on.
  if (noDevServer(res)) {
    console.warn('[booking] /api/book not available in vite dev; run `vercel dev` to send real notifications.');
    return { ok: true };
  }
  // Someone else booked this time in GHL a moment ago.
  if (res.status === 409) throw new SlotTakenError();
  if (!res.ok) throw new Error(`Booking failed (${res.status})`);
  return { ok: true };
}

export class SlotTakenError extends Error {
  constructor() {
    super('That time was just booked.');
    this.name = 'SlotTakenError';
  }
}
