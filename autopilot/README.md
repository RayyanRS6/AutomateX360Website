# AutomateX360 · Website + Booking System

One-page sales funnel (autopilot.automatex360.com) for the **$449/month, all
of it** offer (ads in
`my ads/`). One goal: book a 20-minute call. It's the sister site of the studio
funnel (studio.automatex360.com): same brand colours and type, the same
GoHighLevel calendar, Google Sheet and WhatsApp alerts, with a more playful
design: AI agents' cursors working on the page, hanging signs and tags.

Built with Vite, TypeScript and Tailwind CSS. Components are written in React,
and the build runs them on **Preact** (through `preact/compat`), which ships
about a third of React's JavaScript. The production build is prerendered to
static HTML, so the page shows before any JavaScript loads.

This site lives in the `autopilot/` folder of the same repo as the studio site
(`../studio`). Each is its own Vercel project: same repo, different **Root
Directory** (`autopilot` here, `studio` there).

## Run it

From this `autopilot/` folder:

```bash
npm install
npm run dev        # http://localhost:5184
npm run build      # production build in dist/
npm run preview    # serve the build at http://localhost:4184
```

## Change the words

Every word on the page is in `src/content.ts`, including the labels inside the
animations. The page title and link-preview text are in `index.html`. Items
marked `TODO` need your real answer before ads go live: what happens after
the 3-month minimum (and any setup cost), which follow-up emails you send,
what the chatbot is set up with, setup time, how the call happens (phone or
video) and the privacy line under the form.

Your booking hours, minimum notice and how far ahead people can book are set
on the GHL calendar, not here: `config.availability` in `src/content.ts` is
only the fallback used when GHL isn't connected.

## The page

| Section | File | From the ads |
| --- | --- | --- |
| Hero, agents working the night shift | `src/sections/Hero.tsx` | "Wake up to a full calendar." |
| The problem | `src/sections/Problem.tsx` | "Your competitor replied first." / "Ours replies in seconds." |
| What you get | `src/sections/Included.tsx` | The five included items |
| Open 24 hours | `src/sections/Night.tsx` | "Yes, we're Open." / the booked-out week |
| Pricing ticket | `src/sections/Pricing.tsx` | "$449 a month, all of it" |
| Our work | `src/sections/Proof.tsx` | Real portfolio sites only |
| Who it's for | `src/sections/Filter.tsx` | "Not for owners happy where they are." |
| Booking, FAQ, final call | `Booking.tsx`, `Faq.tsx`, `FinalCta.tsx` | "Do not click this ad if you don't want to grow." |

The agents (`agents` in `src/content.ts`) are drawn with `AgentCursor` in
`src/components/ui.tsx`; hanging props use `Hanging`. Animated scenes are laid
out in container units so the cursors land on their targets at any width.

## Booking → GoHighLevel + Google Sheet + WhatsApp

Exactly like the studio site (see `../studio/README.md` for the one-time GHL
and Google Sheet setup). The form has two steps: whether they have a website
plus their name, email and phone, then a day and time. Confirming the time
books the call:

1. The time step loads your free times from the **same GHL calendar**
   (`api/slots.ts`), including its minimum notice.
2. `api/book.ts` creates or updates the contact, books the appointment
   ("Booking system call: …"), adds one tag, **`autopilot-website`** (the
   studio site adds `studio-website`), and a note with their details.
3. It also sends the booking to the **same Google Sheet script**, so you get
   the same WhatsApp alert. No change to the script is needed: the "Budget"
   column shows the plan and whether they need a new site or upkeep of
   theirs, and "Notes" shows the source ("Booking system website").

If GHL refuses a booking (other than the time being taken), the lead still
reaches the sheet and WhatsApp, marked "⚠️ NOT in your GHL calendar" with
GHL's own error.

## Deploy (second Vercel project from the same repo + subdomain)

1. In Vercel: **Add New → Project**, import the same GitHub repo as the studio
   site (`AutomateX360Website`).
2. Under **Root Directory**, click Edit and pick **`autopilot`**. The rest
   (Vite, `npm run build`, output `dist`, the `api/` functions) comes from
   `autopilot/vercel.json`.
3. **Settings → Environment Variables**: the same values as the studio project
   (`GHL_TOKEN`, `GHL_LOCATION_ID`, `GHL_CALENDAR_ID`, `SHEET_WEBHOOK_URL`,
   `SHEET_SECRET`), plus optional `OWNER_TIMEZONE`. See `.env.example`, or
   import the shared `.env` at the repo root. Then redeploy.
4. **Settings → Domains**: add the subdomain `autopilot.automatex360.com`
   and create the CNAME record Vercel shows at your DNS provider.
5. Make one test booking and check GHL, the sheet and WhatsApp.

## Performance

- Motion animates `transform` and `opacity` only. Scenes loop only while
  they're on screen, and stop on lite devices and with reduced motion, which
  show the finished scene instead.
- A small script in `index.html` puts weak devices (4 GB of memory or less, or
  4 CPU cores or fewer; iPhones excepted) into a **lite** mode before first
  paint, and a watchdog switches any device to lite if it sees the page
  stutter. `?lite` / `?full` in the URL force a mode for testing.
- Sections below the hero render lazily (`content-visibility: auto`).
