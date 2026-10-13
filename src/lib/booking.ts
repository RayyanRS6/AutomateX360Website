// Booking logic for the UI. Availability is generated in the browser so the
// calendar works as a demo: every weekday slot in `config.bookingHours` is
// shown as open, in the visitor's local time. Replace `getSlots` and
// `submitBooking` with calls to your scheduler (Cal.com, Calendly, Google
// Calendar…) when wiring it up, so visitors only see times you really have.

import { config } from '../content';

export type BudgetId = 'under' | 'mid' | 'high';

export type BookingRequest = {
  budget: BudgetId;
  website: string | null;
  start: Date;
  durationMin: number;
  name: string;
  email: string;
  phone: string;
  business: string;
  notes: string;
  timeZone: string;
};

export const CALL_MINUTES = config.callMinutes;

/** Minimum notice before a call, so a slot is never offered moments before it starts. */
const LEAD_MINUTES = 60;

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

/** First and last bookable day. Calls start tomorrow so there is time to prepare. */
export function bookingWindow(now = new Date()) {
  const first = addDays(startOfDay(now), 1);
  const last = addDays(first, config.bookingDaysAhead - 1);
  return { first, last };
}

/**
 * Open slots for a day, in the visitor's local time. Weekends are closed.
 * `day` may carry a time of day (e.g. a picked slot); only its date is used.
 */
export function getSlots(day: Date, now = new Date()): Date[] {
  const d = startOfDay(day);
  const { first, last } = bookingWindow(now);
  if (d < first || d > last) return [];
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return [];

  const { start, end, slotMinutes } = config.bookingHours;
  const earliest = now.getTime() + LEAD_MINUTES * 60_000;
  const slots: Date[] = [];
  for (let m = start * 60; m + CALL_MINUTES <= end * 60; m += slotMinutes) {
    const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60);
    if (slot.getTime() >= earliest) slots.push(slot);
  }
  return slots;
}

/** Whether a picked slot is still bookable under the rules at time `now`. */
export function isSlotOpen(slot: Date, now = new Date()) {
  return getSlots(slot, now).some((s) => s.getTime() === slot.getTime());
}

export function isBookable(day: Date, now = new Date()) {
  return getSlots(day, now).length > 0;
}

export function firstBookableDay(now = new Date()) {
  const { first, last } = bookingWindow(now);
  for (let d = first; d <= last; d = addDays(d, 1)) if (isBookable(d, now)) return d;
  return first;
}

export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  } catch {
    return 'local time';
  }
}

/** "Central European Summer Time"-style label for the visitor's zone. */
export function timeZoneLabel(at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? localTimeZone();
  } catch {
    return localTimeZone();
  }
}

export const fmt = {
  time: (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  dayLong: (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
  dayShort: (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
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
 * forwards the lead to WhatsApp. The WhatsApp token lives only on the server.
 * `honeypot` is a hidden field people never see; bots fill it in.
 *
 * Throws on failure, so the form shows its error message and the visitor can
 * try again instead of believing they're booked.
 */
export async function submitBooking(req: BookingRequest, honeypot = ''): Promise<{ ok: true }> {
  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, start: req.start.toISOString(), company: honeypot }),
  });
  // `npm run dev` has no server functions; use `vercel dev` to test the real
  // send. Plain Vite dev lets the flow finish so the UI can still be worked on.
  if (import.meta.env.DEV && res.status === 404) {
    console.warn('[booking] /api/book not available in vite dev; run `vercel dev` to send real notifications.');
    return { ok: true };
  }
  if (!res.ok) throw new Error(`Booking failed (${res.status})`);
  return { ok: true };
}
