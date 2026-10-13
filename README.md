# AutomateX360 funnel page

One-page sales funnel for ad traffic. One goal: book a 20-minute call.

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

Deploy on **Vercel**: import the GitHub repo; the settings in `vercel.json`
are picked up automatically (Vite, `npm run build`, output `dist`, plus the
`api/` function). Add the environment variables below before taking bookings.

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
- Your real booking hours, once the calendar is connected.

## Add or change portfolio sites

1. Edit the `work` list in `src/content.ts` (name, industry, live link).
   Add a `result` only when you have a real number.
2. Run `npm run capture`. It screenshots each live site with your installed
   Edge or Chrome (headless, for a minute or so) and writes optimised images
   to `public/work/`. `npm run capture -- --no-shoot` only rebuilds the image
   sizes from the last screenshots, without opening a browser.
3. `heroWork` in `src/content.ts` picks which site is shown large in the hero.

## Booking → Google Sheet → WhatsApp

When someone confirms a call, the page posts the booking to `api/book.ts`, a
Vercel serverless function. The function checks the booking and forwards it,
with a shared password, to a Google Sheet script
(`google-apps-script/Code.gs`). The script saves the booking as a row in the
sheet and sends it to your WhatsApp through the WhatsApp agent.

Nothing secret is in the browser or this repo: the script's URL and the
shared password live in Vercel's environment variables, and the WhatsApp
agent's API key lives in the script's Script Properties.

Anyone who picks "Under $2,000" sees a polite "not a fit" message and never
reaches the calendar (the function also rejects under-budget bookings). A
hidden spam-trap field quietly drops bot submissions.

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
| `SHEET_WEBHOOK_URL` | The Web app URL from step 6 |
| `SHEET_SECRET` | The same password as `SHARED_SECRET` |
| `OWNER_TIMEZONE` | Your time zone, e.g. `Asia/Karachi`, so the call time is shown in yours |

Then redeploy (environment variables apply to new deployments) and make a
test booking.

If saving fails, the visitor sees "That didn't go through. Please try again"
(so no lead is silently lost), and the reason appears in Vercel's function
logs. A WhatsApp problem never blocks the booking: the row is still saved,
and the script's error shows under Executions in Apps Script.

### Test locally

`npm run dev` has no server functions; the form completes without sending.
To test the real send, install the Vercel CLI and run `vercel dev` with the
variables in a `.env.local` file (git-ignored).

### Availability

Calendar times are generated in the browser: weekdays, 9:00 to 17:00 in the
**visitor's** time zone, so someone abroad can pick a time that is outside
your hours. Every alert shows the time in your zone (`OWNER_TIMEZONE`) and in
theirs. To show only your real availability, connect a scheduler (Cal.com,
Calendly, Google Calendar) in `getSlots` in `src/lib/booking.ts`.

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
