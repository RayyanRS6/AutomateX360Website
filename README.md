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

## Booking → WhatsApp

When someone confirms a call, the page posts the booking to `api/book.ts`, a
Vercel serverless function. The function checks the booking and sends the
lead to your WhatsApp through the WhatsApp Cloud API (Meta). The access token
lives only in Vercel's environment variables: it is never in the browser code
or in this repo.

Anyone who picks "Under $2,000" sees a polite "not a fit" message and never
reaches the calendar (the function also rejects under-budget bookings). A
hidden spam-trap field quietly drops bot submissions.

### Set it up in Vercel

In Vercel: Project → Settings → Environment Variables, add (see `.env.example`):

| Variable | Value |
| --- | --- |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta App → WhatsApp → API Setup → "Phone number ID" of the sending number |
| `WHATSAPP_NOTIFY_TO` | Your WhatsApp number(s), country code, digits only, comma-separated |
| `WHATSAPP_TEMPLATE` | Optional but recommended: approved template name (below) |
| `WHATSAPP_TEMPLATE_LANG` | Template language code, e.g. `en` or `en_US` |
| `OWNER_TIMEZONE` | Your time zone, e.g. `Asia/Karachi`, so alerts show your local time |

Then redeploy (environment variables apply to new deployments).

Things WhatsApp requires:

- **Token:** the token on Meta's API Setup page expires after 24 hours. For
  the live site, create a permanent token (Business Settings → System Users →
  generate token with `whatsapp_business_messaging`).
- **Test number:** while using Meta's free test number, add your own number as
  a recipient on the API Setup page, or messages are refused.
- **Template:** WhatsApp only delivers free-form text if you've messaged the
  business number in the last 24 hours. To get every alert, create a
  **Utility** template (WhatsApp Manager → Message templates), set
  `WHATSAPP_TEMPLATE` to its name, and use exactly these 9 variables in order:

  ```
  New call booked
  Name: {{1}}
  Business: {{2}}
  Email: {{3}}
  Phone: {{4}}
  Website: {{5}}
  Budget: {{6}}
  When: {{7}}
  Their time: {{8}}
  Notes: {{9}}
  Confirm the call with them by email.
  ```

If the send fails, the visitor sees "That didn't go through. Please try
again" (so no lead is silently lost), and the reason appears in Vercel's
function logs.

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
