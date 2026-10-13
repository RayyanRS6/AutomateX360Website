// Vercel Function: POST /api/book
//
// Receives a booking from the page, checks it, and sends the lead to WhatsApp
// through the WhatsApp Cloud API (Meta). It runs on the server, so the access
// token never reaches the browser or the repo: it is read from Vercel's
// environment variables (see .env.example and the README).
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

/** The fields of a lead, in the order used for both the text message and template variables. */
function leadFields(lead: Lead, ownerTimeZone: string) {
  return {
    name: lead.name,
    business: lead.business || '-',
    email: lead.email,
    phone: lead.phone || '-',
    website: lead.website || 'No website yet',
    budget: BUDGETS[lead.budget],
    when: `${formatWhen(lead.start, ownerTimeZone)} (${lead.durationMin} min)`,
    theirTime: `${formatWhen(lead.start, lead.timeZone)} (${lead.timeZone})`,
    notes: lead.notes || '-',
  };
}

function textMessage(f: ReturnType<typeof leadFields>) {
  return [
    '*New call booked* 📅',
    '',
    `*Name:* ${f.name}`,
    `*Business:* ${f.business}`,
    `*Email:* ${f.email}`,
    `*Phone:* ${f.phone}`,
    `*Website:* ${f.website}`,
    `*Budget:* ${f.budget}`,
    `*When:* ${f.when}`,
    `*Their time:* ${f.theirTime}`,
    `*Notes:* ${f.notes}`,
  ].join('\n');
}

/** Template variables can't contain line breaks, tabs or long runs of spaces. */
const templateParam = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 1000) || '-';

async function sendWhatsApp(to: string, payload: Record<string, unknown>) {
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // Log Meta's error for the Vercel logs; never echo it to the visitor.
    console.error(`WhatsApp send to ${to.slice(0, 4)}… failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

export async function POST(request: Request): Promise<Response> {
  // Only accept posts from this site's own pages.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'Forbidden.' });

  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_NOTIFY_TO } = process.env;
  const recipients = (WHATSAPP_NOTIFY_TO ?? '')
    .split(',')
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean);
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !recipients.length) {
    console.error('Booking received but WhatsApp is not configured (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_NOTIFY_TO).');
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

  // Hidden field that people never see; bots fill it. Pretend it worked.
  if (str(raw.company, 200)) return json(200, { ok: true });

  const lead = parseLead(raw);
  if (typeof lead === 'string') return json(400, { ok: false, error: lead });

  const ownerTimeZone = process.env.OWNER_TIMEZONE && validTimeZone(process.env.OWNER_TIMEZONE) ? process.env.OWNER_TIMEZONE : 'UTC';
  const fields = leadFields(lead, ownerTimeZone);

  // An approved template reaches you any time. A plain text message only
  // arrives if you've messaged the business number in the last 24 hours.
  const template = process.env.WHATSAPP_TEMPLATE;
  const payload = template
    ? {
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.values(fields).map((v) => ({ type: 'text', text: templateParam(v) })),
            },
          ],
        },
      }
    : { type: 'text', text: { preview_url: false, body: textMessage(fields) } };

  const results = await Promise.allSettled(recipients.map((to) => sendWhatsApp(to, payload)));
  const delivered = results.some((r) => r.status === 'fulfilled' && r.value);
  if (!delivered) return json(502, { ok: false, error: 'Could not send the booking. Please try again.' });
  return json(200, { ok: true });
}

export function GET(): Response {
  return json(405, { ok: false, error: 'Use POST.' });
}
