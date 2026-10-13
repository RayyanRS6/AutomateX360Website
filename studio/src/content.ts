// Every word on the page lives here (including the small labels inside the
// illustrations), so copy changes never touch components. The page <title>
// and link-preview text are in index.html.
//
// Items marked TODO need your real answer before ads go live. They are safe
// placeholders, not facts about how you work.

export const brand = {
  name: 'AutomateX360',
  tagline: 'Brand + Website Studio',
  year: 2026,
};

/**
 * The switch between the two AutomateX360 sites in the header. Same order on
 * both sites; `current` is this one. Links open in the same tab. `short` shows
 * on screens too narrow for the full name.
 */
export const siteNav = {
  label: 'AutomateX360 sites',
  current: 'studio',
  sites: [
    { id: 'studio', name: brand.tagline, short: 'Studio', href: 'https://studio.automatex360.com' },
    { id: 'autopilot', name: 'Website + Booking System', short: 'Autopilot', href: 'https://autopilot.automatex360.com' },
  ],
};

export const config = {
  /**
   * "We take [X] new projects a month so every build gets full attention."
   * TODO: your real number, e.g. 4. The line stays hidden while this is null.
   */
  projectsPerMonth: null as number | null,
  /**
   * Minimum project size, used in the copy, the price tag and the budget
   * options. (The filter itself keys off the "Under …" option, and index.html
   * repeats the figure in the page title and link preview.)
   */
  minBudget: '$2,000',
  callMinutes: 20,
  /**
   * Fallback hours, used only when GHL isn't connected (and in `npm run dev`).
   * With GHL connected, visitors see exactly your GHL calendar's free times
   * and the hours, notice and days-ahead below are ignored.
   *
   * Your working hours, in YOUR time zone. Visitors see them converted to
   * theirs: 14:00 to 03:00 Pakistan time is about 4 AM to 5 PM in New York
   * (winter), 1 PM to 2 AM in Dubai. A shift that ends after midnight belongs
   * to the day it starts; `days` are the weekdays a shift starts on
   * (0 = Sunday … 6 = Saturday).
   */
  availability: {
    timeZone: 'Asia/Karachi', // Islamabad, Pakistan (PKT, UTC+5, no daylight saving)
    days: [0, 1, 2, 3, 4, 5, 6], // every day, weekends included
    start: '14:00',
    end: '03:00',
    slotMinutes: 30,
  },
  /** Visitors' time zone when their device doesn't report one (Eastern Time). */
  defaultVisitorTimeZone: 'America/New_York',
  /** Fallback only: the earliest a call can be booked, in hours from now. */
  minNoticeHours: 4,
  /** Fallback only: how many days ahead the calendar shows. */
  bookingDaysAhead: 30,
};

const call = `${config.callMinutes}-minute call`;

export const cta = {
  label: 'Book a call',
  mobileBar: { title: 'Free homepage mockup', sub: `Budgets from ${config.minBudget}` },
  skipLink: 'Skip to booking',
};

export const hero = {
  headline: {
    before: 'Not for someone who wants a',
    price: '$500',
    after: 'website.',
  },
  subhead:
    'We build custom brands and websites for owners who see value, not cost. See your new homepage before you pay anything.',
  ctaNote: { before: 'For website budgets of', strong: config.minBudget, after: 'and up.' },
  // The four promises from the ads, shown as a ruled row like the ad layout.
  promises: ['Custom-made website', 'No hosting fees, for life', 'No plugin fees, for life', 'Built to scale'],
  // Cursors working on the hero homepage, like a shared design file: the
  // designer selects the headline, then you leave a comment. (The selection
  // box in index.css, .hc-select, is measured for mock.headline below.)
  collab: { designer: 'Designer', you: 'You', youInitial: 'Y', comment: 'Love it' },
  // The example homepage drawn inside the hero's laptop and phone
  // (HeroMock.tsx). A design example, not a client.
  mock: {
    url: 'yourbusiness.com',
    brand: 'Your Brand',
    initial: 'Y',
    links: ['Services', 'Work', 'About', 'Contact'],
    navCta: 'Book a visit',
    eyebrow: 'Custom-made for you',
    headline: { plain: 'Built for', em: 'you.' },
    sub: 'A homepage designed around your brand, your services and your customers.',
    primary: 'Get started',
    secondary: 'See our work',
    features: ['Custom-made', 'Built to scale', 'Yours to keep'],
    book: { label: 'Next available', when: 'Tue · 10:30 AM', cta: 'Book' },
    caption: { strong: 'Your homepage', rest: 'designed around your brand, before you pay' },
  },
  // Floating chips over the hero visual. They describe the offer, not events.
  chips: {
    mockup: { title: 'Your homepage', status: 'Before you pay', badge: 'Free' },
    call: { title: call, detail: 'Pick a time that suits you' },
  },
};

/**
 * The "Recent builds" section. Screenshots are taken from the live sites by
 * `npm run capture` (scripts/capture-work.mjs) into /public/work.
 * `result` is optional: leave it out until you have a real number. Never invent one.
 */
export type Work = {
  slug: string;
  name: string;
  industry: string;
  /** Live site, used for the screenshots. */
  href: string;
  /**
   * Address shown in the browser frame. TODO: add the real domain once the
   * site has one; until then the frame shows the business name.
   */
  domain?: string;
  result?: string;
};

export const work: Work[] = [
  {
    slug: 'medical',
    name: 'The Medical',
    industry: 'Physiotherapy & chiropractic clinics',
    href: 'https://themedicalapp.netlify.app/',
  },
  {
    slug: 'nexus',
    name: 'Nexus',
    industry: 'Construction lending & heavy equipment, Florida',
    href: 'https://nexusconstructionsite.netlify.app/',
  },
];

export const proof = {
  eyebrow: 'Recent homepages',
  heading: 'Recent builds. Judge for yourself.',
  hintDesktop: 'Hover to scroll the page. Click to visit the live site.',
  hintMobile: 'Swipe to see more. Tap to visit.',
  visit: 'View live site',
  newTab: 'opens in a new tab',
};

export const offer = {
  eyebrow: 'How it works',
  heading: { plain: 'See it first.', em: 'Pay only if you love it.' },
  steps: [
    {
      title: 'We talk.',
      body: `A ${call} about your business and what the site must do.`,
    },
    {
      title: 'We design your homepage.',
      body: 'A real, custom homepage built around your brand. No payment, no commitment.',
    },
    {
      title: 'You decide.',
      body: 'Love it and we build the full site and take it live. If not, you owe nothing.',
    },
  ],
  ctaNote: 'The homepage mockup is free. You pay only if you approve it.',
  // Labels inside the three step illustrations.
  art: {
    call: 'Call',
    timer: `${config.callMinutes}:00`,
    you: 'You',
    us: 'A',
    topics: ['Your business', 'Goals', 'Must-haves'],
    free: '$0 · No payment',
    mock: { plain: 'Built for', em: 'you.' },
    love: 'Love it',
    build: 'Build the site →',
    no: 'Not for me',
    owe: 'You owe $0',
  },
};

export const value = {
  eyebrow: 'What you get',
  heading: { plain: 'Built once.', em: 'Yours for good.' },
  intro: 'A $500 website keeps billing you for hosting and plugins. Ours doesn’t.',
  tags: {
    caption: { plain: 'People can tell', em: 'what your website cost.' },
    cheap: { price: '$500', lines: ['Template. Plugins.', 'Monthly fees.'] },
    ours: { price: `${config.minBudget}+`, lines: ['Custom-made. Built to scale.', 'No hosting or plugin fees, for life.'] },
  },
  ownership: ['Design', 'Code', 'Domain'],
  ownershipLabel: 'What you own',
  scalePages: ['Home', 'Services', 'Locations'],
  // Labels inside the illustrations.
  art: { template: 'Template', yours: { plain: 'Only', em: 'yours.' }, addPage: 'Add page' },
  items: [
    {
      key: 'custom',
      title: 'Custom-made, not a template.',
      body: "Designed around your brand, not adapted from someone else's.",
    },
    {
      key: 'hosting',
      stat: '$0',
      statNote: 'hosting / month',
      title: 'No hosting fees, for life.',
      body: 'No monthly bill to keep your site online.',
    },
    {
      key: 'plugins',
      stat: '0',
      statNote: 'plugins',
      title: 'No plugins, no plugin fees.',
      body: 'Custom code, so nothing breaks when a plugin updates.',
    },
    {
      key: 'scale',
      title: 'Built to scale.',
      body: 'Add pages, services and locations without a rebuild.',
    },
    {
      key: 'own',
      title: 'One-time cost. Yours to keep.',
      body: 'You own the design, the code and the domain.',
    },
  ],
};

export const filter = {
  eyebrow: 'Who it’s for',
  heading: { plain: 'This isn’t', em: 'for everyone.' },
  sign: { top: 'Sorry, we’re', word: 'Closed', bottom: 'to $500 website budgets.' },
  yes: {
    title: 'Right for you if',
    items: [
      `Your website budget starts at ${config.minBudget}.`,
      'Your current site undersells your business.',
      'You want something no competitor has.',
    ],
  },
  no: {
    title: 'Not for you if',
    items: ['You want the cheapest option.', 'You want a template with your logo on it.', 'You want a site by Friday.'],
  },
};

export const booking = {
  eyebrow: 'Book a call',
  heading: { plain: 'Book your call.', em: 'See your homepage next.' },
  line:
    config.projectsPerMonth === null
      ? null
      : `We take ${config.projectsPerMonth} new projects a month so every build gets full attention.`,
  expect: [
    { title: `A ${call}`, body: 'Pick a time that suits you. No prep needed.' },
    { title: 'Talk us through your business', body: 'Your current site, if you have one, and what the new one must do.' },
    { title: 'Leave with a fixed quote', body: 'You know the price before any work starts.' },
    { title: 'Then your homepage, free', body: 'You see the design before you pay anything.' },
  ],
  card: { title: call, subtitle: 'Free · No obligation' },
  steps: ['Budget', 'Time', 'Details'],
  qualifyHeading: 'Two quick questions first.',
  qualifyNote: 'Takes about 10 seconds.',
  budgetQuestion: 'What’s your website budget?',
  // Everyone can book. Picking "under" asks for the amount, which is passed on with the lead.
  budgets: [
    { id: 'under', label: `Under ${config.minBudget}` },
    { id: 'mid', label: `${config.minBudget} to $5,000` },
    { id: 'high', label: '$5,000+' },
  ] as const,
  budgetAmountQuestion: 'How much is your budget?',
  budgetAmountPlaceholder: 'e.g. 1,000',
  siteQuestion: 'What’s your current website?',
  sitePlaceholder: 'yourbusiness.com',
  noSite: 'I don’t have one yet',
  continue: 'Continue',
  back: 'Back',
  errors: {
    budget: 'Choose the range that fits.',
    siteMissing: 'Add your site address, or tick “I don’t have one yet”.',
    siteInvalid: 'That doesn’t look like a web address. Try yourbusiness.com',
    name: 'Please add your name.',
    emailMissing: 'Please add your email.',
    emailInvalid: 'Check the email address.',
    business: 'Please add your business name.',
    budgetAmount: 'Tell us roughly how much you have in mind.',
    submit: 'That didn’t go through. Please try again, or pick another time.',
    slotGone: 'That time is no longer available. Please pick another.',
    slotTaken: 'Sorry, that time is no longer available. Please pick another.',
  },
  slotsLoading: 'Checking available times…',
  noSlotsAtAll: 'No times are open right now. Please check back soon.',
  slotsError: 'Couldn’t load the available times.',
  retry: 'Try again',
  timeHeading: 'Pick a day and time',
  timesIn: 'Times in',
  timeZoneLabel: 'Your time zone',
  timeZoneHint: 'Set from your device. Change it if it’s not right.',
  chooseDay: 'Choose a day',
  noSlots: 'No times left on this day. Pick another day.',
  // Slot groups, by the hour in the visitor's own time zone.
  dayParts: { early: 'Early hours', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
  // Screen-reader labels.
  a11y: {
    times: 'Available times',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    date: 'Date',
    time: 'Time',
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  },
  detailsHeading: 'Your details',
  change: 'Change',
  changeLabel: 'Change date and time',
  fields: {
    name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    phoneCountry: 'Country code',
    // TODO: confirm, and confirm how the call happens (phone or video). If you
    // phone people, make this field required and say "We'll call you on this number."
    phoneHint: 'Only used to reach you about your call.',
    business: 'Business name',
    notes: 'What must the new site do?',
    notesHint: 'More enquiries, a rebrand, a new location…',
    optional: 'Optional',
  },
  submit: 'Confirm my call',
  submitting: 'Booking…',
  // TODO: keep this true to how you handle leads (follow-ups, CRM, ads).
  privacy: 'We only use these details to arrange your call.',
  done: {
    heading: 'You’re booked',
    // Each booking is added to your GHL calendar and reaches you on WhatsApp
    // (api/book.ts). GHL sends confirmations only if your calendar's
    // notifications are switched on. TODO: keep true: confirm each call by email.
    body: 'We’ll confirm your call by email at',
    next: [
      'On the call, we agree what the site must do and give you a fixed quote.',
      'Then we design your homepage. You pay only if you love it.',
    ],
    addToCalendar: 'Add to calendar',
    reschedule: 'Book a different time',
  },
};

export const faq = {
  eyebrow: 'FAQ',
  heading: { plain: 'Questions,', em: 'answered.' },
  intro: 'Anything else, ask us on the call. That’s what it’s for.',
  items: [
    {
      q: 'Is the mockup really free?',
      a: 'Yes. You pay only if you approve it and want the full site.',
    },
    {
      q: 'What does it cost?',
      a: `Projects start at ${config.minBudget}, one time. You get a fixed quote on the call.`,
    },
    {
      // TODO: replace with your real hosting setup, including who pays for the domain.
      q: 'How is there no hosting fee?',
      a: 'Your site is built with custom code instead of a page builder, so it runs on modern hosting that doesn’t charge a monthly fee. The domain is registered in your name, and we explain exactly how it works on the call.',
    },
    {
      // TODO: replace with your real timeline.
      q: 'How long does it take?',
      a: 'It depends on how many pages you need. You get exact dates on the call, before you commit to anything.',
    },
    {
      // TODO: replace with your real policy.
      q: 'What if I need changes later?',
      a: 'You own the design and the code, so you’re never locked in. We walk you through how changes work on the call.',
    },
    {
      // Not in the original brief. TODO: confirm brand work is offered and how it is quoted.
      q: 'Do you design the brand too?',
      a: 'Yes. If your logo, colours or type need work, we can build the brand alongside the site, so everything feels like one business. Brand work is quoted on the call.',
    },
  ],
};

export const finalCta = {
  hanger: { top: 'Please', line1: 'Do not', line2: 'click', line3: 'this ad.', bottom: 'Not for someone who wants a $500 website.' },
  heading: { plain: 'Still here?', em: 'Then it’s for you.' },
  sub: 'See your homepage before you pay.',
  note: `Website budgets of ${config.minBudget}+ only.`,
};

export const footer = {
  line: 'Custom brands and websites for owners who see value, not cost.',
};
