// Vercel Function: POST /api/book
//
// Receives a booking from the page, checks it, and forwards it to the Google
// Sheet script (google-apps-script/Code.gs). The script saves it as a row and
// sends it to your WhatsApp through the WhatsApp agent.
//
// Secrets stay off the website: the script's URL and the shared password live
// in Vercel's environment variables, and the WhatsApp key lives in the
// script's own properties. See .env.example and the README.
//
// This file is self-contained on purpose (no imports from src/): Vercel runs
// it as its own Node.js function.

const BUDGETS: Record<string, string> = {
  // Keep in step with booking.budgets in src/content.ts.
  mid: '$2,000 to $5,000',
  high: '$5,000+',
};

const LIMITS = { name: 120, email: 200, phone: 40, business: 160, website: 200, notes: 1500, timeZone: 64 };
const MAX_BODY_BYTES = 10_000;
const MAX_DAYS_AHEAD = 62;
// Leaves room for an Apps Script cold start; vercel.json allows the function 30s.
const SHEET_TIMEOUT_MS = 25_000;

type Lead = {
  name: string;
  email: string;
  phone: string;
  business: string;
  website: string | null;
  notes: string;
  budget: string;
  start: Date;
  durationMin: number;
  timeZone: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Checks the request body and returns a clean lead, or an error message. */
function parseLead(raw: Record<string, unknown>): Lead | string {
  const name = str(raw.name, LIMITS.name);
  const email = str(raw.email, LIMITS.email);
  const budget = str(raw.budget, 10);
  const start = new Date(str(raw.start, 40));
  const tz = str(raw.timeZone, LIMITS.timeZone);

  if (!name) return 'Missing name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Invalid email.';
  // Under-budget visitors are stopped in the page; anything else is not a lead.
  if (!(budget in BUDGETS)) return 'Invalid budget.';
  if (Number.isNaN(start.getTime())) return 'Invalid start time.';
  const now = Date.now();
  if (start.getTime() < now || start.getTime() > now + MAX_DAYS_AHEAD * 86_400_000) return 'Start time out of range.';

  const duration = Number(raw.durationMin);
  return {
    name,
    email,
    phone: str(raw.phone, LIMITS.phone),
    business: str(raw.business, LIMITS.business),
    website: str(raw.website, LIMITS.website) || null,
    notes: str(raw.notes, LIMITS.notes),
    budget,
    start,
    durationMin: Number.isFinite(duration) && duration > 0 && duration <= 120 ? duration : 20,
    timeZone: tz && validTimeZone(tz) ? tz : 'UTC',
  };
}

function formatWhen(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

/** The fields the sheet script expects (TABS.booking.keys in Code.gs). */
function sheetFields(lead: Lead, ownerTimeZone: string) {
  return {
    name: lead.name,
    business: lead.business,
    email: lead.email,
    phone: lead.phone,
    website: lead.website ?? 'No website yet',
    budget: BUDGETS[lead.budget],
    callTimeYours: `${formatWhen(lead.start, ownerTimeZone)} (${lead.durationMin} min)`,
    callTimeTheirs: formatWhen(lead.start, lead.timeZone),
    timeZone: lead.timeZone,
    notes: lead.notes,
  };
}

/** Browsers send the page's origin; refuse posts made from other websites (CSRF). */
function crossSite(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false; // Non-browser clients; validation below still applies.
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true; // "null" or malformed origins
  }
}

export async function POST(request: Request): Promise<Response> {
  if (crossSite(request)) return json(403, { ok: false, error: 'Forbidden.' });

  const { SHEET_WEBHOOK_URL, SHEET_SECRET } = process.env;
  if (!SHEET_WEBHOOK_URL || !SHEET_SECRET) {
    console.error('Booking received but the sheet is not configured (SHEET_WEBHOOK_URL, SHEET_SECRET).');
    return json(500, { ok: false, error: 'Booking is not available right now.' });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Too large.' });
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json(400, { ok: false, error: 'Invalid request.' });

  // Hidden field that people never see; bots fill it. Pretend it worked, but
  // log it so a real visitor caught by mistake can be found in Vercel's logs.
  if (str(raw.hp, 200)) {
    console.warn(`Spam trap caught a booking: ${str(raw.name, 120)} <${str(raw.email, 200)}>`);
    return json(200, { ok: true });
  }

  const lead = parseLead(raw);
  if (typeof lead === 'string') return json(400, { ok: false, error: lead });

  const ownerTimeZone = process.env.OWNER_TIMEZONE && validTimeZone(process.env.OWNER_TIMEZONE) ? process.env.OWNER_TIMEZONE : 'UTC';

  try {
    // Apps Script answers a POST with a redirect to the result; fetch follows it.
    const res = await fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SHEET_SECRET, form: 'booking', ...sheetFields(lead, ownerTimeZone) }),
      redirect: 'follow',
      signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
    });
    const body = await res.text();
    let result: { ok?: boolean; error?: string } = {};
    try {
      result = JSON.parse(body);
    } catch {
      // An HTML page here usually means the web app isn't deployed for "Anyone".
    }
    if (!res.ok || result.ok !== true) {
      // Log for Vercel's function logs; never echo details to the visitor.
      const reason = body.trimStart().startsWith('<')
        ? 'got a web page instead of a reply: deploy the script as a Web app with "Who has access: Anyone" (not "Anyone with Google account"), and check SHEET_WEBHOOK_URL ends in /exec'
        : (result.error ?? body.slice(0, 300));
      console.error(`Sheet rejected the booking (${res.status}): ${reason}`);
      return json(502, { ok: false, error: 'Could not save the booking. Please try again.' });
    }
  } catch (err) {
    // On a timeout the row may still have been saved: check the sheet for duplicates.
    console.error(`Could not reach the sheet: ${String(err)}`);
    return json(502, { ok: false, error: 'Could not save the booking. Please try again.' });
  }

  return json(200, { ok: true });
}

export function GET(): Response {
  return json(405, { ok: false, error: 'Use POST.' });
}
