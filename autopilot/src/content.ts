// Every word on the page lives here (including the small labels inside the
// illustrations), so copy changes never touch components. The page <title>
// and link-preview text are in index.html.
//
// Items marked TODO need your real answer before ads go live. They are safe
// placeholders, not facts about how you work.

export const brand = {
  name: 'AutomateX360',
  tagline: 'Website + Booking System',
  year: 2026,
};

/**
 * The switch between the two AutomateX360 sites in the header. Same order on
 * both sites; `current` is this one. Links open in the same tab. `short` shows
 * on screens too narrow for the full name.
 */
export const siteNav = {
  label: 'AutomateX360 sites',
  current: 'autopilot',
  sites: [
    { id: 'studio', name: 'Brand + Website Studio', short: 'Studio', href: 'https://studio.automatex360.com' },
    { id: 'autopilot', name: brand.tagline, short: 'Autopilot', href: 'https://autopilot.automatex360.com' },
  ],
};

export const config = {
  /** The offer, exactly as in the ads. index.html repeats the price in the title. */
  price: '$449',
  priceUnit: 'a month',
  minimum: '3-month minimum',
  callMinutes: 20,
  /**
   * Fallback hours, used only when GHL isn't connected (and in `npm run dev`).
   * With GHL connected, visitors see exactly your GHL calendar's free times
   * and the hours, notice and days-ahead below are ignored.
   *
   * Your working hours, in YOUR time zone. Visitors see them converted to
   * theirs. A shift that ends after midnight belongs to the day it starts;
   * `days` are the weekdays a shift starts on (0 = Sunday … 6 = Saturday).
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
const priceLine = `${config.price} ${config.priceUnit}, all of it`;

export const cta = {
  label: 'Book a call',
  mobileBar: { title: `${config.price}/month, all of it`, sub: 'Website + chatbot + calendar' },
  skipLink: 'Skip to booking',
};

/**
 * The AI agents whose cursors work on the page, like teammates in a shared
 * design file. Each has one job from the offer. `tone` picks the cursor colour.
 */
export const agents = {
  reply: { name: 'Reply agent', tone: 'ember' },
  booking: { name: 'Booking agent', tone: 'ink' },
  followup: { name: 'Follow-up agent', tone: 'sun' },
  site: { name: 'Website agent', tone: 'paper' },
} as const;
export type AgentId = keyof typeof agents;

/** The four lines from the ads, shown as a ruled row like the ad layout. */
export const features = ['New site, or we maintain yours', 'Chatbot that books', 'Email follow-ups', 'Calendar + WhatsApp'];

export const hero = {
  status: 'Agents online · replying now',
  headline: { before: 'Wake up to a', em: 'full calendar.' },
  subhead: 'A website that replies, follows up and books the appointment for you. Even at 11:42 PM.',
  price: { amount: config.price, unit: `${config.priceUnit}, all of it`, note: config.minimum },
  // The hanging shop tag.
  tag: { top: 'All of it', amount: config.price, unit: 'a month' },
  // Labels inside the live demo. An example of how it works, not a real customer.
  demo: {
    url: 'yourbusiness.com',
    label: 'Example',
    clock: '11:42 PM',
    chatTitle: 'Chat with us',
    chatStatus: 'Replies in seconds',
    visitor: 'New visitor',
    ask: 'Hi, are you free this Saturday?',
    answer: 'Yes! Saturday at 10:30 AM or 2:00 PM?',
    slots: ['10:30 AM', '2:00 PM'],
    booked: 'Booked: Sat, 10:30 AM',
    input: 'Type a message…',
    calendarTitle: 'This week',
    days: ['Fri', 'Sat'],
    bookedChip: 'Booked',
    email: { title: 'Confirmation sent', body: 'See you Saturday at 10:30 AM.' },
    note: { line1: 'Replied at 11:42 PM.', line2: 'You were asleep.' },
    // For screen readers: what the animation shows.
    description:
      'Example: at 11:42 PM a visitor asks your website if you are free on Saturday. It replies in seconds with two times, books them for 10:30 AM, adds it to your calendar and emails a confirmation.',
  },
};

/**
 * Recent builds, shown as proof that the websites themselves are good. The
 * screenshots in /public/work come from the live sites (`npm run capture`).
 * `result` is optional: leave it out until you have a real number. Never invent one.
 */
export type Work = {
  slug: string;
  name: string;
  industry: string;
  /** Live site, used for the screenshots and the card link. */
  href: string;
  /** TODO: the real domain once the site has one; until then the frame shows the name. */
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
  eyebrow: 'Our work',
  heading: { plain: 'Websites we’ve', em: 'built.' },
  intro: 'Need a new site? This is the standard you get. Keeping yours? We look after it just as well.',
  hintDesktop: 'Hover to scroll the page. Click to visit the live site.',
  hintMobile: 'Swipe to see more. Tap to visit.',
  visit: 'View live site',
  newTab: 'opens in a new tab',
};

export const problem = {
  eyebrow: 'The problem',
  heading: { plain: 'Your competitor', em: 'replied first.' },
  sub: 'People message more than one business, and book with whoever answers first. At 11:42 PM, that’s rarely you.',
  kicker: { plain: 'Your competitors love your', em: 'slow replies.' },
  stamp: { center: 'Ours replies in seconds.', ring: 'Replies in seconds · Day and night · ' },
  without: {
    label: 'Your inbox today',
    messages: [
      { text: 'Hi, are you free this Saturday?', time: '11:42 PM' },
      { text: 'Hello?', time: '11:58 PM' },
    ],
    status: 'No reply',
    outcome: 'They booked somewhere else.',
  },
  with: {
    label: 'With AutomateX360',
    ask: { text: 'Hi, are you free this Saturday?', time: '11:42 PM' },
    answer: { text: 'Yes! Saturday has 10:30 AM or 2:00 PM. Which works?', time: '11:42 PM' },
    status: 'Replied in seconds',
    outcome: 'Booked. While you slept.',
  },
};

export const included = {
  eyebrow: 'What you get',
  heading: { plain: 'A front desk', em: 'that never sleeps.' },
  intro: `Everything below is set up for you and kept running. ${priceLine}.`,
  items: [
    {
      key: 'site',
      agent: 'site',
      title: 'New website, or we maintain yours',
      body: 'Starting fresh? We build it. Happy with yours? We keep it fast, up to date and working.',
      art: { url: 'yourbusiness.com', status: 'Updated', blocks: ['Hero', 'Services', 'Book now'] },
    },
    {
      key: 'chatbot',
      agent: 'reply',
      title: 'A chatbot that books appointments',
      body: 'It answers questions about your business and books people into your calendar, day or night.',
      art: { ask: 'Do you have anything tomorrow?', answer: 'Yes, 9:00 AM or 1:30 PM.', other: '9:00 AM', slot: '1:30 PM', booked: 'Booked' },
    },
    {
      key: 'followups',
      agent: 'followup',
      // TODO: confirm which emails you send (confirmations, reminders, follow-ups).
      title: 'Automated email follow-ups',
      body: 'Confirmations and reminders go out on their own, so fewer people forget or drift away.',
      art: {
        emails: [
          { subject: 'You’re booked', meta: 'Sent instantly' },
          { subject: 'See you tomorrow', meta: 'Reminder · 1 day before' },
          { subject: 'Still looking for a time?', meta: 'Follow-up' },
        ],
        sent: 'Sent',
      },
    },
    {
      key: 'calendar',
      agent: 'booking',
      title: 'A booking calendar, set up for you',
      body: 'People pick a time that suits them and it lands in your calendar. No back-and-forth.',
      art: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], booked: 'Booked' },
    },
    {
      key: 'whatsapp',
      agent: 'reply',
      title: 'WhatsApp chat on your site',
      body: 'Visitors message you on WhatsApp in one tap, from any page.',
      art: { button: 'Chat on WhatsApp', message: 'Hi! Quick question about prices', online: 'Online' },
    },
  ],
};

export const night = {
  eyebrow: 'While you sleep',
  heading: { plain: 'Your business closes at 6.', em: 'Your website shouldn’t.' },
  sign: { top: 'Yes, we’re', word: 'Open', bottom: '24 hours. Even when you’re not.' },
  // An example night, hour by hour.
  timeline: [
    { time: '6:00 PM', title: 'You close up.', body: 'Your website stays open.' },
    { time: '11:42 PM', title: 'Someone asks about Saturday.', body: 'Your website replies in seconds.' },
    { time: '11:43 PM', title: 'They pick 10:30 AM.', body: 'It lands straight in your calendar.' },
    { time: '11:44 PM', title: 'A confirmation goes out.', body: 'Email sent. No one had to type it.' },
    { time: '9:00 AM', title: 'You open your calendar.', body: 'It filled up overnight.' },
  ],
  board: {
    title: 'Wake up to a full calendar.',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    booked: 'Booked',
    // Which cells are booked (row by row), like the ad.
    grid: [
      [1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 1, 1],
    ],
  },
};

export const pricing = {
  eyebrow: 'Pricing',
  heading: { plain: `${config.price} a month.`, em: 'All of it.' },
  sub: `One monthly price for the whole system. ${config.minimum}.`,
  ticket: {
    items: [
      'New website, or we maintain yours',
      'Chatbot that books appointments',
      'Automated email follow-ups',
      'Booking calendar, set up for you',
      'WhatsApp chat on your site',
    ],
    top: 'All of it',
    amount: config.price,
    unit: 'a month',
    note: config.minimum,
  },
  // The sticky note on the ticket.
  sticky: 'Yes, all of it.',
  // TODO: confirm, e.g. what happens after the first 3 months, and any setup cost.
  smallPrint: 'You get the full picture on the call, before you commit to anything.',
};

export const filter = {
  eyebrow: 'Who it’s for',
  heading: { plain: 'Not for owners', em: 'happy where they are.' },
  sub: 'Only for business owners who want to scale.',
  yes: {
    title: 'Right for you if',
    items: ['People message you after hours.', 'You miss calls and messages when you’re busy.', 'You want more booked appointments without hiring.'],
  },
  no: {
    title: 'Not for you if',
    items: ['You’re happy with how things are.', 'You don’t want more customers.', 'You’d rather answer every message yourself.'],
  },
  chart: {
    label: 'Booked appointments',
    you: 'You, with it',
    // For screen readers: what the chart shows.
    alt: 'Illustration: a bar chart of booked appointments rising from left to right. The tallest bar is labelled “You, with it”.',
  },
};

export const booking = {
  eyebrow: 'Book a call',
  heading: { plain: 'Book a call.', em: 'Fill your calendar next.' },
  expect: [
    { title: `A ${call}`, body: 'Pick a time that suits you. No prep needed.' },
    { title: 'We look at how enquiries reach you now', body: 'Your website, your messages, your calendar.' },
    { title: 'We set everything up', body: 'New site or yours, chatbot, follow-ups, calendar and WhatsApp.' },
    { title: 'Your website starts booking', body: 'Day and night, while you get on with the work.' },
  ],
  card: { title: call, subtitle: 'Free · No obligation' },
  steps: ['About you', 'Time', 'Details'],
  qualifyHeading: 'Three quick questions.',
  qualifyNote: 'Takes about 15 seconds.',
  siteQuestion: 'Do you have a website?',
  siteOptions: [
    { id: 'maintain', label: 'Yes, keep mine' },
    { id: 'replace', label: 'Yes, but I want a new one' },
    { id: 'new', label: 'No, build me one' },
  ] as const,
  siteUrlLabel: 'Your website',
  sitePlaceholder: 'yourbusiness.com',
  industryQuestion: 'What kind of business?',
  industries: [
    'Clinic or health',
    'Beauty or wellness',
    'Home services',
    'Real estate',
    'Fitness',
    'Restaurant or café',
    'Professional services',
    'Something else',
  ],
  replyQuestion: 'How fast do you reply to new enquiries now?',
  replyOptions: [
    { id: 'minutes', label: 'Within minutes' },
    { id: 'hours', label: 'Within a few hours' },
    { id: 'nextday', label: 'Next day or later' },
    { id: 'missed', label: 'Some get missed' },
  ] as const,
  // A small reaction under the chosen answer.
  replyReaction: {
    minutes: 'Nice. We’ll keep it that way at 11 PM too.',
    hours: 'Hours is long enough to lose a booking.',
    nextday: 'That’s what we fix first.',
    missed: 'Honest. That’s exactly what we fix.',
  },
  continue: 'Continue',
  back: 'Back',
  errors: {
    siteStatus: 'Choose one.',
    siteMissing: 'Add your site address.',
    siteInvalid: 'That doesn’t look like a web address. Try yourbusiness.com',
    industry: 'Pick the closest one.',
    reply: 'Pick the closest one.',
    name: 'Please add your name.',
    emailMissing: 'Please add your email.',
    emailInvalid: 'Check the email address.',
    business: 'Please add your business name.',
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
    // TODO: confirm, and how the call happens (phone or video).
    phoneHint: 'Only used to reach you about your call.',
    business: 'Business name',
    notes: 'Anything we should know?',
    notesHint: 'What you sell, where enquiries come from…',
    optional: 'Optional',
  },
  submit: 'Confirm my call',
  submitting: 'Booking…',
  // TODO: keep this true to how you handle leads (follow-ups, CRM, ads).
  privacy: 'We only use these details to arrange your call.',
  done: {
    heading: 'You’re booked',
    // GHL sends confirmations only if the calendar's notifications are on. TODO: keep true.
    body: 'We’ll confirm your call by email at',
    next: [
      'On the call, we look at how enquiries reach you now.',
      'Then we show you how your website would reply and book, day and night.',
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
      q: 'I already have a website. Do I need a new one?',
      a: 'No. We can keep your current site, look after it, and add the chatbot, follow-ups, calendar and WhatsApp chat. If you’d rather start fresh, a new site is included too.',
    },
    {
      q: `What’s included in the ${config.price}?`,
      a: 'All of it: a new website or upkeep of yours, a chatbot that books appointments, automated email follow-ups, a booking calendar set up for you, and WhatsApp chat on your site.',
    },
    {
      // TODO: replace with your real terms after the first 3 months.
      q: 'Is there a contract?',
      a: `There’s a ${config.minimum}. We explain exactly what happens after that on the call, before you commit.`,
    },
    {
      // TODO: confirm what the chatbot is set up with.
      q: 'What does the chatbot actually do?',
      a: 'It answers common questions about your business and books people into your calendar, any time of day. We set it up with your services and hours.',
    },
    {
      q: 'Do I need to be technical?',
      a: 'No. We set everything up and keep it running. You just show up to the appointments.',
    },
    {
      // TODO: replace with your real timeline.
      q: 'How long does setup take?',
      a: 'It depends on whether we build a new site or work with yours. You get a clear timeline on the call.',
    },
  ],
};

export const finalCta = {
  hanger: { top: 'Please', line1: 'Do not', line2: 'click', line3: 'this ad', bottom: 'if you don’t want to grow.' },
  heading: { plain: 'Still here?', em: 'Then you want to grow.' },
  sub: 'Book a call. See how your website would reply, follow up and book for you.',
  note: `${priceLine} · ${config.minimum}`,
};

export const footer = {
  line: 'Websites that reply, follow up and book the appointment for you.',
};
