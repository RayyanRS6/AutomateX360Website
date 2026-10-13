# AutomateX360 funnel page

One-page sales funnel for ad traffic. One goal: book a 20-minute call.

This is the `studio/` folder of the AutomateX360 websites repo (the
booking-system site is in `../autopilot`). On Vercel, this project's **Root
Directory** is `studio`. Run every command below from this folder.

Built with Vite, TypeScript and Tailwind CSS. Components are written in React,
and the build runs them on **Preact** (through `preact/compat`), which ships
about a third of React's JavaScript (29 KB instead of 89 KB gzipped). To go
back to React, swap `@preact/preset-vite` for `@vitejs/plugin-react` in
`vite.config.ts` and reinstall `react-dom`.

The production build is prerendered to static HTML, so the page shows before
any JavaScript loads.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build at http://localhost:4173
```

Deploy on **Vercel**: import the GitHub repo and set **Root Directory** to
`studio` (Settings → Build and Deployment). The rest comes from
`studio/vercel.json`: Vite, `npm run build`, output `dist`, plus the `api/`
functions. Add the environment variables below before taking bookings.

## Change the words

Every word on the page is in `src/content.ts`, including the small labels in
the illustrations. The page title and link-preview text are in `index.html`.
Items marked `TODO` need your real answer before ads go live:

- `projectsPerMonth`: the "We take [X] new projects a month" line in the
  booking section. It stays hidden until you set a number.
- FAQ answers about hosting, timeline and changes after launch.
- `domain` for each portfolio site (the browser frames show the business name
  until a real domain is set).
- How the call happens (phone or video), the phone-field hint and the privacy
  line under the booking form.

Your booking hours, minimum notice and how far ahead people can book are set
on the GHL calendar (see "Set up GoHighLevel" below), not in `src/content.ts`:
`config.availability` there is only the fallback used when GHL isn't connected.

## Add or change portfolio sites

1. Edit the `work` list in `src/content.ts` (name, industry, live link).
   Add a `result` only when you have a real number.
2. Run `npm run capture`. It screenshots each live site with your installed
   Edge or Chrome (headless, for a minute or so) and writes optimised images
   to `public/work/`. `npm run capture -- --no-shoot` only rebuilds the image
   sizes from the last screenshots, without opening a browser.
3. The hero's laptop and phone show an example homepage drawn in code
   (`src/sections/HeroMock.tsx`, words in `hero.mock` in `src/content.ts`),
   not a screenshot.

## Booking → GoHighLevel + Google Sheet + WhatsApp

When a visitor reaches the time step, the page asks `api/slots.ts` for your
free times in your **GoHighLevel calendar**, so anything you're already booked
for never shows. When they confirm, `api/book.ts`:

1. **GoHighLevel:** creates or updates the contact, books the appointment on
   your calendar (if someone took the time a moment earlier, the visitor is
   asked to pick another), then adds the tag **`studio-website`** and a note
   with the call time, budget, website, phone and notes.
2. **Google Sheet → WhatsApp:** forwards the booking, with a shared password,
   to the sheet script (`google-apps-script/Code.gs`), which saves a row and
   sends you a WhatsApp alert.

Everyone can book, whatever their budget. Picking "Under $2,000" asks how much
their budget is, and that amount goes with the lead. A hidden spam-trap field
quietly drops bot submissions.

Nothing secret is in the browser or this repo: the GHL token, the sheet's URL
and its password live in Vercel's environment variables, and the WhatsApp
agent's API key lives in the sheet script's Script Properties.

### 0. Set up GoHighLevel (once)

1. **Calendar:** in GHL, open the calendar visitors should book into. Set its
   time zone to **Asia/Karachi**, its availability to your hours (**every day,
   2 PM to 3 AM**), the slot length and interval (e.g. 30 minutes) and a
   minimum notice. These settings decide which times visitors see.
2. **Private Integration token:** Settings → Private Integrations. Use a token
   with the scopes `calendars.readonly`, `calendars/events.write` and
   `contacts.write`. All three are needed: without `contacts.write`, GHL
   refuses the contact, so no appointment is booked and the time stays open.
3. Note your **Location ID** (Settings → Business Profile, or the part after
   `/location/` in the GHL address bar) and the **Calendar ID** (in the
   calendar's settings or its booking link).
### 1. Set up the Google Sheet (once)

1. Create a Google Sheet. From inside it, open **Extensions → Apps Script**
   (this attaches the script to the sheet).
2. Replace everything in `Code.gs` with `google-apps-script/Code.gs` from this
   repo, and save (Ctrl+S). If you're not in Pakistan, change `TIME_ZONE` at
   the top to your zone (the same value as `OWNER_TIMEZONE` in Vercel).
3. **Project Settings** (gear icon) → **Script Properties** → add:
   - `SHARED_SECRET`: a long random password (you'll put the same value in Vercel).
   - `WHATSAPP_API_KEY`: your WhatsApp agent's API key.
   - `SHEET_ID`: only if you created the script outside the sheet (e.g. on
     script.google.com): paste your sheet's link. Not needed when you used
     Extensions → Apps Script.
4. In the editor, pick `setup` in the function menu and click **Run**. Google
   warns "Google hasn't verified this app" because it's your own private
   script: click **Advanced → Go to (project name) (unsafe)**, tick
   **Select all**, then **Continue**. This creates the **Bookings** tab.
5. Send your WhatsApp agent any message from your phone, then run
   `connectWhatsApp`. You get "✅ Connected!" on WhatsApp when it works.
6. **Deploy → New deployment →** gear icon **→ Web app**. Execute as: **Me**.
   Who has access: **Anyone** (not "Anyone with Google account"). Click
   **Deploy** and copy the Web app URL (ends in `/exec`).
7. Open that URL in a **private/incognito window**. It should list: Sheet
   connected, Password set, WhatsApp connected. A Google sign-in page there
   means "Who has access" isn't "Anyone".

After editing the script later, publish the change with Deploy → Manage
deployments → Edit → Version: **New version** (the URL stays the same).

### 2. Set up Vercel

Project → Settings → Environment Variables (see `.env.example`):

| Variable | Value |
| --- | --- |
| `GHL_TOKEN` | Your GHL Private Integration token (`pit-…`) |
| `GHL_LOCATION_ID` | Your GHL Location ID |
| `GHL_CALENDAR_ID` | The GHL calendar to book into |
| `SHEET_WEBHOOK_URL` | The Web app URL from step 6 |
| `SHEET_SECRET` | The same password as `SHARED_SECRET` |
| `OWNER_TIMEZONE` | Optional. Defaults to `Asia/Karachi` (Islamabad), the zone your call times are shown in |

Then redeploy (environment variables apply to new deployments) and make a
test booking.

If saving fails, the visitor sees "That didn't go through. Please try again"
(so no lead is silently lost), and the reason appears in Vercel's function
logs. A WhatsApp problem never blocks the booking: the row is still saved,
and the script's error shows under Executions in Apps Script.

If GHL refuses a booking for any reason other than the time being taken (a
missing token scope, a wrong ID), the lead still reaches the sheet and
WhatsApp, marked **"⚠️ NOT in your GHL calendar"** followed by GHL's own
error. That time is not blocked in GHL, so fix the cause straight away and
add the call to GHL by hand. **"⚠️ MAYBE NOT"** means GHL timed out or had an
error of its own while booking: check GHL before adding the call, since it
may have been booked anyway.

### Test locally

`npm run dev` has no server functions; the form completes without sending.
To test the real send, install the Vercel CLI, run `vercel link` and then
`vercel dev` from the repo root (the project's Root Directory is `studio`),
with the variables in `studio/.env.local` (git-ignored).

### Availability and time zones

- With GHL connected, visitors see exactly the free times of your GHL
  calendar. Without it (or in `npm run dev`), the page falls back to the hours
  in `config.availability` in `src/content.ts`: every day, 2 PM to 3 AM
  Pakistan time.
- The visitor's time zone is read from their device's clock settings, so the
  browser never asks for permission. If it can't be read, it's Eastern Time.
  The booking card has a time-zone picker so they can change it.
- The phone field has a country-code picker, preset from the visitor's time
  zone or browser language. Numbers are sent in international format (+971…).
- Every booking is saved and sent to you with the call time in **your** time
  (Pakistan) and in **theirs**.
- With GHL connected, the page adds no rules of its own: GHL's availability,
  minimum notice and booking window decide every time shown. The page reads
  the calendar's minimum notice too, so while a visitor is choosing, a time
  disappears as soon as GHL would stop accepting it. It loads up to 30 days of
  free times (the most GHL returns at once). `minNoticeHours` and
  `bookingDaysAhead` in `src/content.ts` only apply to the fallback hours.

## Performance

- Motion only animates `transform` and `opacity`. Looping animations play a
  few times when they come on screen, then stop.
- Real frosted-glass blur is used only on small surfaces (header, hero chips,
  mobile CTA bar). Larger "glass" panels sit on soft gradients, so they look
  frosted without the blur cost.
- A small script in `index.html` puts weak devices (4 GB of memory or less, or
  4 CPU cores or fewer; iPhones excepted) into a **lite** mode before first
  paint: no blur, no parallax, no looping animation.
- A watchdog switches any other device to lite if it sees the page stutter
  while the visitor scrolls or moves the mouse.
- Parallax and the hero's mouse-follow depth run on desktop only.
- Sections below the hero use `content-visibility: auto`, so phones lay out
  only what is on screen.
- Add `?lite` or `?full` to the URL to force either mode when testing.
