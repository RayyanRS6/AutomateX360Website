// Vercel Function: GET /api/slots
//
// Your free times from your GoHighLevel calendar, so visitors only see slots
// when you're really available (anything already booked in GHL is gone).
// Returns exact moments in UTC; the page shows them in each visitor's time zone.
// Also returns the calendar's minimum scheduling notice, so the page can drop a
// time the moment GHL would stop accepting it (the list is a snapshot).
//
// The GHL token stays on the server (Vercel environment variables). If GHL
// isn't set up, this replies { source: "local" } and the page falls back to
// the hours in src/content.ts.
//
// Self-contained on purpose (no imports from other files): Vercel runs it as
// its own Node.js function.

const GHL_BASE = 'https://services.leadconnectorhq.com';
// GHL's API version for its calendar endpoints.
const CALENDARS_VERSION = '2021-04-15';
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30; // GHL allows at most 31 days per request
const UNIT_MINUTES: [string, number][] = [['min', 1], ['hour', 60], ['day', 1440], ['week', 10_080], ['month', 43_200]];

const json = (status: number, body: unknown, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

/** Pulls every slot out of GHL's { "YYYY-MM-DD": { slots: [...] } } reply, as sorted UTC ISO strings. */
function collectSlots(data: unknown): string[] {
  const out = new Set<string>();
  if (!data || typeof data !== 'object') return [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    const slots = (value as { slots?: unknown } | null)?.slots;
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      const raw = typeof s === 'string' ? s : (s as { startTime?: string; slot?: string } | null)?.startTime ?? (s as { slot?: string } | null)?.slot;
      const t = raw ? Date.parse(raw) : NaN;
      if (Number.isFinite(t)) out.add(new Date(t).toISOString());
    }
  }
  return [...out].sort();
}

/** The calendar's "minimum scheduling notice" in minutes (1 + "hours" → 60); 0 when not set. */
function noticeMinutes(data: unknown): number {
  const cal = (data as { calendar?: { allowBookingAfter?: unknown; allowBookingAfterUnit?: unknown } } | null)?.calendar;
  const amount = Number(cal?.allowBookingAfter);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const unit = String(cal?.allowBookingAfterUnit ?? 'hours').toLowerCase();
  return amount * (UNIT_MINUTES.find(([u]) => unit.startsWith(u))?.[1] ?? 60);
}

export async function GET(): Promise<Response> {
  const { GHL_TOKEN, GHL_CALENDAR_ID } = process.env;
  if (!GHL_TOKEN || !GHL_CALENDAR_ID) return json(200, { source: 'local' });

  // Round to 15 minutes so many visitors share one cached answer.
  const start = Math.floor(Date.now() / 900_000) * 900_000;
  const end = start + WINDOW_DAYS * DAY_MS;
  const params = new URLSearchParams({ startDate: String(start), endDate: String(end), timezone: 'UTC' });
  const calendar = `${GHL_BASE}/calendars/${encodeURIComponent(GHL_CALENDAR_ID)}`;
  const ghlGet = (url: string) =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${GHL_TOKEN}`,
        Version: process.env.GHL_API_VERSION || CALENDARS_VERSION,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

  const [free, settings] = await Promise.allSettled([ghlGet(`${calendar}/free-slots?${params}`), ghlGet(calendar)]);
  if (free.status === 'rejected') {
    console.error(`GHL free-slots unreachable: ${String(free.reason)}`);
    return json(502, { error: 'Could not load times.' });
  }
  const res = free.value;
  if (!res.ok) {
    console.error(`GHL free-slots failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return json(502, { error: 'Could not load times.' });
  }
  const slots = collectSlots(await res.json());

  // Without the notice the times still show; GHL refuses any that are too soon.
  let notice = 0;
  if (settings.status === 'fulfilled' && settings.value.ok) notice = noticeMinutes(await settings.value.json().catch(() => null));
  else console.warn(`GHL calendar settings unavailable (${settings.status === 'fulfilled' ? settings.value.status : String(settings.reason)}): no notice cutoff`);

  // Short CDN cache: fresh enough for booking, light on GHL's rate limits.
  return json(200, { source: 'ghl', slots, noticeMinutes: notice }, 'public, s-maxage=60, stale-while-revalidate=60');
}
