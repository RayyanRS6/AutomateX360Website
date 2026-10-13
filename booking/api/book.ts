// Vercel Function: POST /api/book
//
// Receives a booking from the page and checks it, then:
//   1. GoHighLevel: creates or updates the contact, books the appointment on
//      your calendar (GHL refuses times that were taken meanwhile), adds the
//      tag "booking-website" (GHL_TAG overrides it) and a note with the lead's
//      details.
//   2. Google Sheet: forwards the booking to the sheet script
//      (google-apps-script/Code.gs), which saves a row and sends you WhatsApp.
//      Same sheet and columns as the studio site: the "Budget" column gets the
//      plan and what they need, and their answers go in "Notes".
// Either part can be switched off by leaving its environment variables empty.
//
// Secrets stay off the website: the GHL token, the sheet's URL and its
// password live in Vercel's environment variables, and the WhatsApp key lives
// in the sheet script's properties. See .env.example and the README.
//
// Self-contained on purpose (no imports from other files): Vercel runs it as
// its own Node.js function.

// Keep in step with booking.siteOptions / replyOptions in src/content.ts.
const SITE_STATUS: Record<string, string> = {
  maintain: 'Has a website, wants us to maintain it',
  replace: 'Has a website, wants a new one',
  new: 'No website yet, wants one built',
};
const REPLY_SPEED: Record<string, string> = {
  minutes: 'Within minutes',
  hours: 'Within a few hours',
  nextday: 'Next day or later',
  missed: 'Some get missed',
};
const PLAN = '$449/mo Website + Booking System';
const SOURCE = 'Booking system website';

const LIMITS = { name: 120, email: 200, phone: 40, business: 160, website: 200, notes: 1500, timeZone: 64, industry: 60 };
const MAX_BODY_BYTES = 10_000;
const MAX_DAYS_AHEAD = 62;
const SHEET_TIMEOUT_MS = 20_000;
const GHL_BASE = 'https://services.leadconnectorhq.com';
// GHL's API version for each part of its API.
const GHL_VERSIONS = { contacts: '2021-07-28', calendars: '2021-04-15' };
const GHL_TIMEOUT_MS = 10_000;
const DEFAULT_GHL_TAG = 'booking-website';
// The owner is in Islamabad, Pakistan. OWNER_TIMEZONE in Vercel can override it.
const DEFAULT_OWNER_TIME_ZONE = 'Asia/Karachi';

type Lead = {
  name: string;
  email: string;
  phone: string;
  business: string;
  website: string | null;
  notes: string;
  siteStatus: string;
  industry: string;
  replySpeed: string;
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
  const siteStatus = str(raw.siteStatus, 20);
  const replySpeed = str(raw.replySpeed, 20);
  const industry = str(raw.industry, LIMITS.industry);
  const start = new Date(str(raw.start, 40));
  const tz = str(raw.timeZone, LIMITS.timeZone);

  if (!name) return 'Missing name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Invalid email.';
  if (!Object.hasOwn(SITE_STATUS, siteStatus)) return 'Invalid website answer.';
  if (!Object.hasOwn(REPLY_SPEED, replySpeed)) return 'Invalid reply-speed answer.';
  if (!industry) return 'Missing business type.';
  if (Number.isNaN(start.getTime())) return 'Invalid start time.';
  const now = Date.now();
  if (start.getTime() < now || start.getTime() > now + MAX_DAYS_AHEAD * 86_400_000) return 'Start time out of range.';

  const duration = Number(raw.durationMin);
  return {
    name,
    email,
    phone: str(raw.phone, LIMITS.phone),
    business: str(raw.business, LIMITS.business),
    // No website to keep when they said they don't have one.
    website: siteStatus === 'new' ? null : str(raw.website, LIMITS.website) || null,
    notes: str(raw.notes, LIMITS.notes),
    siteStatus,
    industry,
    replySpeed,
    start,
    durationMin: Number.isFinite(duration) && duration > 0 && duration <= 120 ? duration : 20,
    timeZone: tz && validTimeZone(tz) ? tz : 'America/New_York',
  };
}

/** e.g. "Mon, Oct 20, 6:30 PM Pakistan Standard Time". */
function formatWhen(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'long',
  }).format(d);
}

/** "$449/mo Website + Booking System · Has a website, wants a new one" (the sheet's "Budget" column). */
function planLabel(lead: Lead) {
  return `${PLAN} · ${SITE_STATUS[lead.siteStatus]}`;
}

/** Their step-1 answers, for the sheet's "Notes" column and the GHL note. */
function answers(lead: Lead) {
  return [`Business type: ${lead.industry}`, `Replies to enquiries: ${REPLY_SPEED[lead.replySpeed]}`];
}

/* ---------------- GoHighLevel ---------------- */

type GhlConfig = { token: string; locationId: string; calendarId: string };
/** `unsure`: GHL timed out or errored on the appointment itself, so it may have been booked anyway. */
type GhlResult = { status: 'booked'; contactId: string } | { status: 'taken' } | { status: 'failed'; reason: string; unsure?: boolean };

function ghlConfig(): GhlConfig | null {
  const { GHL_TOKEN, GHL_LOCATION_ID, GHL_CALENDAR_ID } = process.env;
  return GHL_TOKEN && GHL_LOCATION_ID && GHL_CALENDAR_ID ? { token: GHL_TOKEN, locationId: GHL_LOCATION_ID, calendarId: GHL_CALENDAR_ID } : null;
}

async function ghlPost(cfg: GhlConfig, path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(`${GHL_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Version: process.env.GHL_API_VERSION || (path.startsWith('/contacts') ? GHL_VERSIONS.contacts : GHL_VERSIONS.calendars),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GHL_TIMEOUT_MS),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text.slice(0, 300) };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: String(err) } };
  }
}

const ghlMessage = (data: Record<string, unknown>) => {
  const m = data.message;
  return (Array.isArray(m) ? m.join('; ') : String(m ?? '')).slice(0, 300);
};

/** Contact + appointment. Tag and note are added afterwards by `finishInGhl`. */
async function bookInGhl(cfg: GhlConfig, lead: Lead, description: string): Promise<GhlResult> {
  const [firstName, ...rest] = lead.name.split(/\s+/);
  const contact: Record<string, unknown> = {
    locationId: cfg.locationId,
    firstName,
    lastName: rest.join(' ') || undefined,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || undefined,
    companyName: lead.business || undefined,
    website: lead.website || undefined,
    timezone: lead.timeZone,
    source: SOURCE,
    // No `tags` here: on upsert they would replace the contact's existing tags.
  };
  let up = await ghlPost(cfg, '/contacts/upsert', contact);
  // GHL rejects some phone formats; keep the lead and put the number in the note instead.
  if (!up.ok && contact.phone && (up.status === 400 || up.status === 422)) {
    delete contact.phone;
    up = await ghlPost(cfg, '/contacts/upsert', contact);
  }
  const contactId = (up.data.contact as { id?: string } | undefined)?.id;
  if (!up.ok || !contactId) return { status: 'failed', reason: `contact upsert ${up.status}: ${ghlMessage(up.data)}` };

  const appt = await ghlPost(cfg, '/calendars/events/appointments', {
    calendarId: cfg.calendarId,
    locationId: cfg.locationId,
    contactId,
    startTime: lead.start.toISOString(),
    title: `Booking system call: ${lead.business || lead.name}`,
    appointmentStatus: 'confirmed',
    description,
    toNotify: true,
  });
  if (appt.ok) return { status: 'booked', contactId };
  const msg = ghlMessage(appt.data);
  // GHL checks the slot is still free; if not, the visitor picks another time.
  if ([400, 409, 422].includes(appt.status) && /slot|availab|booked|taken|conflict/i.test(msg)) {
    // Logged so repeated refusals of times GHL itself listed show up in Vercel's logs.
    console.warn(`GHL refused the time ${lead.start.toISOString()} (${appt.status}): ${msg}`);
    return { status: 'taken' };
  }
  return { status: 'failed', reason: `appointment ${appt.status}: ${msg}`, unsure: appt.status === 0 || appt.status >= 500 };
}

/** Adds the single tag and a note with the lead's details. Failures are logged only. */
async function finishInGhl(cfg: GhlConfig, contactId: string, note: string) {
  const [tag, noteRes] = await Promise.all([
    ghlPost(cfg, `/contacts/${encodeURIComponent(contactId)}/tags`, { tags: [process.env.GHL_TAG?.trim() || DEFAULT_GHL_TAG] }),
    ghlPost(cfg, `/contacts/${encodeURIComponent(contactId)}/notes`, { body: note }),
  ]);
  if (!tag.ok) console.error(`GHL tag failed (${tag.status}): ${ghlMessage(tag.data)}`);
  if (!noteRes.ok) console.error(`GHL note failed (${noteRes.status}): ${ghlMessage(noteRes.data)}`);
}

/* ---------------- Google Sheet ---------------- */

/** The fields the sheet script expects (TABS.booking.keys in Code.gs). */
function sheetFields(lead: Lead, ownerTimeZone: string, notes: string) {
  return {
    name: lead.name,
    business: lead.business,
    email: lead.email,
    phone: lead.phone,
    website: lead.website ?? 'No website yet',
    budget: planLabel(lead),
    callTimeYours: `${formatWhen(lead.start, ownerTimeZone)} (${lead.durationMin} min)`,
    callTimeTheirs: formatWhen(lead.start, lead.timeZone),
    timeZone: lead.timeZone,
    notes,
  };
}

async function sendToSheet(url: string, secret: string, fields: ReturnType<typeof sheetFields>): Promise<boolean> {
  try {
    // Apps Script answers a POST with a redirect to the result; fetch follows it.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, form: 'booking', ...fields }),
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
    if (res.ok && result.ok === true) return true;
    const reason = body.trimStart().startsWith('<')
      ? 'got a web page instead of a reply: deploy the script as a Web app with "Who has access: Anyone" (not "Anyone with Google account"), and check SHEET_WEBHOOK_URL ends in /exec'
      : (result.error ?? body.slice(0, 300));
    console.error(`Sheet rejected the booking (${res.status}): ${reason}`);
    return false;
  } catch (err) {
    // On a timeout the row may still have been saved: check the sheet for duplicates.
    console.error(`Could not reach the sheet: ${String(err)}`);
    return false;
  }
}

/* ---------------- Handler ---------------- */

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

  const ghl = ghlConfig();
  const { SHEET_WEBHOOK_URL, SHEET_SECRET } = process.env;
  const sheet = SHEET_WEBHOOK_URL && SHEET_SECRET ? { url: SHEET_WEBHOOK_URL, secret: SHEET_SECRET } : null;
  if (!ghl && !sheet) {
    console.error('Booking received but nothing is configured (GHL_* or SHEET_* environment variables).');
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

  const ownerTimeZone =
    process.env.OWNER_TIMEZONE && validTimeZone(process.env.OWNER_TIMEZONE) ? process.env.OWNER_TIMEZONE : DEFAULT_OWNER_TIME_ZONE;
  const details = [
    `Call (your time): ${formatWhen(lead.start, ownerTimeZone)}`,
    `Call (their time): ${formatWhen(lead.start, lead.timeZone)}`,
    `Plan: ${planLabel(lead)}`,
    `Website: ${lead.website ?? 'No website yet'}`,
    ...answers(lead),
    `Phone: ${lead.phone || '-'}`,
    `Notes: ${lead.notes || '-'}`,
  ].join('\n');

  // 1. GoHighLevel first: it is the source of truth for whether the time is still free.
  let ghlResult: GhlResult | null = null;
  if (ghl) {
    ghlResult = await bookInGhl(ghl, lead, details);
    if (ghlResult.status === 'taken') return json(409, { ok: false, error: 'slot_taken' });
    if (ghlResult.status === 'failed') console.error(`GHL booking failed: ${ghlResult.reason}`);
  }

  // 2. Tag + note in GHL, and the sheet/WhatsApp alert, side by side. On a GHL
  // failure the alert says why, so a broken token or setting shows up at once.
  // The sheet has the studio site's columns, so their answers and the source go in Notes.
  const theirNotes = [...answers(lead), lead.notes ? `Their notes: ${lead.notes}` : '', `Source: ${SOURCE}`].filter(Boolean).join(' · ');
  const notes =
    ghlResult?.status === 'failed'
      ? `${ghlResult.unsure ? '⚠️ MAYBE NOT in your GHL calendar: check GHL before adding it.' : '⚠️ NOT in your GHL calendar, add it manually.'} GHL said: ${ghlResult.reason.replace(/\.+$/, '')}. ${theirNotes}`
      : theirNotes;
  const [, sheetOk] = await Promise.all([
    ghlResult?.status === 'booked' && ghl ? finishInGhl(ghl, ghlResult.contactId, `Booked via the ${SOURCE.toLowerCase()}.\n${details}`) : null,
    sheet ? sendToSheet(sheet.url, sheet.secret, sheetFields(lead, ownerTimeZone, notes)) : false,
  ]);

  // Booked in GHL, or at least saved to the sheet (so the lead is never lost).
  if (ghlResult?.status === 'booked' || sheetOk) return json(200, { ok: true });
  return json(502, { ok: false, error: 'Could not save the booking. Please try again.' });
}

export function GET(): Response {
  return json(405, { ok: false, error: 'Use POST.' });
}
