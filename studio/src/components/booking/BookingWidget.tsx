import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, Check, CircleCheck, Clock, Globe, LoaderCircle, Lock } from 'lucide-react';
import { booking, brand, config } from '../../content';
import {
  CALL_MINUTES,
  SlotTakenError,
  buildIcs,
  dateIn,
  detectTimeZone,
  downloadIcs,
  fetchAvailability,
  firstBookableDay,
  fmt,
  getSlots,
  hourIn,
  isBookable,
  isSlotOpen,
  looksLikeEmail,
  looksLikePhone,
  looksLikeUrl,
  normaliseUrl,
  openSlots,
  submitBooking,
  zoneName,
  type BudgetId,
} from '../../lib/booking';
import { guessCountry, toInternational } from '../../lib/countries';
import { trackPixel } from '../../lib/pixel';
import { Calendar } from './Calendar';
import { PhoneField } from './PhoneField';
import { TimeZoneSelect } from './TimeZoneSelect';

/** `section`: the booking section's card, details first. `hero`: the hero's card, time first. */
type Variant = 'hero' | 'section';
type Step = 'details' | 'time' | 'done';
type SlotsStatus = 'idle' | 'loading' | 'ready' | 'error';
type FormState = { name: string; email: string; phone: string };
type Errors = Partial<Record<keyof FormState | 'budget' | 'budgetAmount' | 'site' | 'submit', string>>;
/** What was actually sent, so the confirmation can't drift from the request. */
type Booked = { start: Date; name: string; email: string; timeZone: string };

const EMPTY: FormState = { name: '', email: '', phone: '' };
/** Each card's step order. */
const STEP_INDEX: Record<Variant, Record<Step, number>> = {
  section: { details: 0, time: 1, done: 2 },
  hero: { time: 0, details: 1, done: 2 },
};
/** Where to put the cursor for each details problem, in the order they appear (before the card's id prefix). */
const FIELD_IDS = { budget: 'budget-0', budgetAmount: 'budget-amount', site: 'site', name: 'f-name', email: 'f-email', phone: 'f-phone' } as const;
/** Free times older than this are re-checked in the background. */
const SLOTS_MAX_AGE_MS = 2 * 60_000;
const e = booking.errors;

/**
 * The booking card, in two steps. The page has two: the booking section's
 * asks for budget, website and how to reach them, then shows a calendar of
 * your free times (from GoHighLevel when connected); the hero's
 * (`variant="hero"`) starts with the calendar and asks for the details second.
 * Either way nothing is sent until the last step: its button books the call,
 * and only once every detail and the time check out.
 *
 * With two cards on one page, every id in the hero's card starts with
 * "hero-". The section's keeps the plain ids that goToBooking() looks for.
 */
export function BookingWidget({ variant = 'section' }: { variant?: Variant }) {
  const timeFirst = variant === 'hero';
  // A fixed prefix rather than useId, so the prerendered HTML and the hydrated page agree.
  const idOf = (name: string) => (timeFirst ? `hero-${name}` : name);
  // The hero's card sits straight under the page's h1, the section's under its h2.
  const Heading = timeFirst ? 'h2' : 'h3';

  const [step, setStep] = useState<Step>(timeFirst ? 'time' : 'details');
  const [budget, setBudget] = useState<BudgetId | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [site, setSite] = useState('');
  const [noSite, setNoSite] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [country, setCountry] = useState('US');
  const [now, setNow] = useState(() => new Date());
  // Visitor's time zone: Eastern Time in the prerendered page, then their
  // device's own zone once the script runs (no permission needed).
  const [tz, setTz] = useState(config.defaultVisitorTimeZone);
  const [deviceTz, setDeviceTz] = useState(config.defaultVisitorTimeZone);
  const [slotsStatus, setSlotsStatus] = useState<SlotsStatus>('idle');
  const [slotsTick, setSlotsTick] = useState(0);
  const [month, setMonth] = useState<Date | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  const card = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  /** The spam trap's value, kept after the details form (where the field lives) closes. */
  const trapped = useRef('');
  /** Set the moment a booking is sent, so a double click or Enter can't send it twice. */
  const sending = useRef(false);
  const prevStep = useRef(step);
  /** Set when the card changes step on its own while they're elsewhere: no focus or scroll for that one. */
  const quietStep = useRef(false);
  const slotsLoading = useRef<Promise<void> | null>(null);
  const slotsLoadedAt = useRef(0);

  /** One of this card's own fields (never the other card's). */
  const field = (name: string) => card.current?.querySelector<HTMLInputElement>(`#${idOf(name)}`) ?? null;

  // Move focus to each new step's heading, and bring the card back into view
  // if the step change left the visitor scrolled past its top. Comparing with
  // the previous step (not a mount flag) keeps this right under StrictMode.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    if (quietStep.current) {
      quietStep.current = false;
      return;
    }
    stepHeading.current?.focus({ preventScroll: true });
    const top = card.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) card.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  // The page is prerendered, so a visitor on a slow phone can fill in the
  // details before the script loads, and browsers restore form fields on
  // back/forward. Take whatever is already in this card's fields as the
  // starting state.
  useLayoutEffect(() => {
    const picked = card.current?.querySelector<HTMLInputElement>('input[name="budget"]:checked');
    if (picked) setBudget(picked.value as BudgetId);
    const typed = (name: string) => field(name)?.value ?? '';
    if (typed('budget-amount')) setBudgetAmount(typed('budget-amount'));
    if (typed('site')) setSite(typed('site'));
    if (field('no-site')?.checked) setNoSite(true);
    const filled = { name: typed('f-name'), email: typed('f-email'), phone: typed('f-phone') };
    if (filled.name || filled.email || filled.phone) setForm(filled);
    const detected = detectTimeZone();
    setTz(detected);
    setDeviceTz(detected);
    setCountry(guessCountry(detected));
  }, []);

  /**
   * Loads your free times. `background` keeps the current calendar on screen
   * while re-checking (and keeps it if the re-check fails).
   */
  function loadSlots({ fresh = false, background = false } = {}) {
    if (slotsLoading.current && !fresh) return slotsLoading.current;
    if (!background) setSlotsStatus('loading');
    const run = fetchAvailability(fresh)
      .then(() => {
        slotsLoadedAt.current = Date.now();
        setSlotsStatus('ready');
        setSlotsTick((t) => t + 1);
      })
      .catch(() => {
        if (!background) setSlotsStatus('error');
      })
      .finally(() => {
        slotsLoading.current = null;
      });
    slotsLoading.current = run;
    return run;
  }

  // The hero's card opens on the calendar, so load the free times as soon as
  // the script runs (the prerendered card shows "Checking available times…").
  useEffect(() => {
    if (timeFirst) loadSlots();
  }, []);

  // A tab left open for hours must not offer times that have passed or been booked since.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      if (slotsLoadedAt.current && Date.now() - slotsLoadedAt.current > SLOTS_MAX_AGE_MS) loadSlots({ background: true });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);

  // While they pick a time (or, time first, fill in the details with one
  // picked), keep the clock moving (times drop off as GHL stops accepting
  // them) and re-check GHL every couple of minutes.
  const holdingTime = step === 'time' || (timeFirst && step === 'details');
  useEffect(() => {
    if (!holdingTime) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      if (slotsLoadedAt.current && Date.now() - slotsLoadedAt.current > SLOTS_MAX_AGE_MS) loadSlots({ background: true });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [holdingTime]);

  // Keep the chosen day and time valid as the clock moves and fresh times arrive.
  useEffect(() => {
    // Once booked, nothing on the confirmation depends on the clock.
    if (step === 'done' || slotsStatus !== 'ready') return;
    if (!day || !isBookable(day, now, tz)) {
      const d = firstBookableDay(now, tz);
      setDay(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    // A booking on its way settles the time itself (book() handles a refusal).
    if (slot && !sending.current && !isSlotOpen(slot, now)) {
      setSlot(null);
      // Say why the picked time went away, so it doesn't just vanish. Time
      // first, the details step shows that time, so go back to pick another.
      if (step === 'time' || timeFirst) {
        // This happens on a timer, not a click. If they've moved on (to the
        // other card, or further down the page), turn this card back without
        // pulling focus or the page up to it; they'll see why when they return.
        if (step !== 'time') quietStep.current = !card.current?.contains(document.activeElement);
        go('time');
        setErrors({ submit: e.slotGone });
      }
    }
    // Only re-check when the clock moves or new times arrive.
  }, [now, slotsTick, slotsStatus]);

  const go = (s: Step) => {
    setErrors({});
    setStep(s);
  };

  /** Filling in the details means they're about to book: load the free times now, so the calendar is ready. */
  function warmUp() {
    if (slotsStatus === 'idle') loadSlots();
  }

  function pickBudget(id: BudgetId) {
    setBudget(id);
    setErrors((x) => ({ ...x, budget: undefined }));
    warmUp();
  }

  /** What's missing or wrong in the details (empty when they're all fine). */
  function detailErrors(): Errors {
    const next: Errors = {};
    if (!budget) next.budget = e.budget;
    if (budget === 'under' && !/\d/.test(budgetAmount)) next.budgetAmount = e.budgetAmount;
    if (!noSite && !looksLikeUrl(site)) next.site = site.trim() ? e.siteInvalid : e.siteMissing;
    if (!form.name.trim()) next.name = e.name;
    if (!looksLikeEmail(form.email)) next.email = form.email.trim() ? e.emailInvalid : e.emailMissing;
    if (!looksLikePhone(form.phone)) next.phone = form.phone.trim() ? e.phoneInvalid : e.phoneMissing;
    return next;
  }

  /** Details first: on to the calendar. Time first: this is the last step, so it books the call. */
  function onDetails(ev: FormEvent) {
    ev.preventDefault();
    // A booking is already on its way (a second click, or Enter in a field).
    if (sending.current) return;
    const next = detailErrors();
    setErrors(next);
    const first = (Object.keys(FIELD_IDS) as (keyof typeof FIELD_IDS)[]).find((k) => next[k]);
    if (first) {
      field(FIELD_IDS[first])?.focus();
      return;
    }
    trapped.current = honeypot.current?.value ?? '';
    if (timeFirst) {
      book();
      return;
    }
    setNow(new Date());
    if (slotsStatus === 'idle' || slotsStatus === 'error') loadSlots();
    else if (Date.now() - slotsLoadedAt.current > SLOTS_MAX_AGE_MS) loadSlots({ background: true });
    go('time');
  }

  function pickSlot(s: Date) {
    if (submitting) return;
    setSlot(s);
    if (errors.submit) setErrors((x) => ({ ...x, submit: undefined }));
    // On phones the slot list is long; bring the main button up so the next step is obvious.
    if (window.innerWidth < 768) {
      requestAnimationFrame(() => confirmBtn.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  }

  /** Time first: on to the details. Nothing is sent yet. */
  function toDetails() {
    if (!slot) return;
    if (!isSlotOpen(slot, new Date())) {
      slotLost(e.slotGone);
      return;
    }
    go('details');
  }

  /**
   * The picked time can't be booked any more: back to the calendar with the
   * reason, fresh times loading behind it. Everything they typed is kept.
   */
  function slotLost(message: string) {
    setSlot(null);
    setNow(new Date());
    loadSlots({ fresh: true, background: true });
    go('time');
    // After go(), which clears errors.
    setErrors({ submit: message });
  }

  /**
   * The only place a booking is sent: api/book.ts books it in GoHighLevel and
   * sends the WhatsApp alert. Only a complete form gets through (every detail
   * valid, a time picked and still open), once per press of the last button.
   */
  async function book() {
    if (sending.current) return;
    const problems = detailErrors();
    if (!budget || Object.keys(problems).length) {
      go('details');
      setErrors(problems);
      return;
    }
    // Re-check against the real current time (a tab can sit open until the
    // picked time is too soon to book or has passed).
    if (!slot || !isSlotOpen(slot, new Date())) {
      slotLost(e.slotGone);
      return;
    }
    sending.current = true;
    const request = { start: slot, name: form.name.trim(), email: form.email.trim(), timeZone: tz };
    setErrors({});
    setSubmitting(true);
    try {
      await submitBooking(
        {
          budget,
          budgetAmount: budget === 'under' ? budgetAmount.trim() : '',
          website: noSite ? null : normaliseUrl(site),
          durationMin: CALL_MINUTES,
          phone: toInternational(country, form.phone),
          ...request,
        },
        trapped.current,
      );
      // Only now is the whole form in, so only now does the ad account hear about it.
      trackPixel('Lead');
      trackPixel('Schedule');
      setBooked(request);
      go('done');
    } catch (err) {
      // Someone else took it a moment ago: refresh the times and let them pick again.
      if (err instanceof SlotTakenError) slotLost(e.slotTaken);
      else setErrors({ submit: e.submit });
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  function reset() {
    setSlot(null);
    setBooked(null);
    setNow(new Date());
    loadSlots({ fresh: true, background: true });
    go('time');
  }

  /** Back to the first step. Ignored while a booking is being sent. */
  function back() {
    if (!submitting) go(timeFirst ? 'time' : 'details');
  }

  const set = (k: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    warmUp();
  };

  /** Show the same moments in another zone: keep the picked slot, move the calendar to its date there. */
  function changeTz(next: string) {
    setTz(next);
    if (slotsStatus !== 'ready') return;
    const d = slot ? dateIn(slot, next) : day && isBookable(day, now, next) ? day : firstBookableDay(now, next);
    setDay(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const ready = slotsStatus === 'ready' && !!month;
  const anyOpen = ready && openSlots(now).length > 0;
  const slots = ready && day ? getSlots(day, now, tz) : [];
  // Group the day's times by the hour in the visitor's zone, so a long list is easy to scan.
  const parts = booking.dayParts;
  const slotGroups = [
    { label: parts.early, slots: slots.filter((s) => hourIn(s, tz) < 6) },
    { label: parts.morning, slots: slots.filter((s) => hourIn(s, tz) >= 6 && hourIn(s, tz) < 12) },
    { label: parts.afternoon, slots: slots.filter((s) => hourIn(s, tz) >= 12 && hourIn(s, tz) < 17) },
    { label: parts.evening, slots: slots.filter((s) => hourIn(s, tz) >= 17) },
  ].filter((g) => g.slots.length);

  // Layouts follow the card's own width (@container below), not the screen's,
  // since the card sits in a wide column in one place and a narrower one in
  // the other. Back sits under the main button in a narrow card, beside it in a wide one.
  const actionRow = 'mt-6 flex flex-col-reverse items-stretch gap-3 @lg:flex-row @lg:items-center @lg:justify-between';
  const mainBtn = 'btn-cta w-full @lg:w-auto';
  const backBtn = 'btn-ghost justify-center @lg:justify-start';
  const headingClass = 'font-serif text-[1.85rem] leading-tight outline-none';
  const confirmLabel = submitting ? (
    <>
      <LoaderCircle size={18} className="animate-[spin_0.8s_linear_infinite]" aria-hidden /> {booking.submitting}
    </>
  ) : (
    <>
      {booking.submit} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
    </>
  );

  return (
    <div className="@container">
      <div ref={card} id={idOf('booking-card')} className="glass-soft rounded-[32px] p-1.5 sm:p-2">
        <div className="overflow-hidden rounded-[26px] bg-white/75 ring-1 ring-ink/5">
          {/* Card header */}
          <div className="flex items-center justify-between gap-4 border-b border-ink/[0.07] px-5 py-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink font-serif text-[22px] italic leading-none text-cream">
                A
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[15px] font-semibold">{booking.card.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-stone">
                  <Clock size={13} aria-hidden /> {booking.card.subtitle}
                </p>
              </div>
            </div>
            {step !== 'done' && <Stepper labels={timeFirst ? booking.stepsTimeFirst : booking.steps} index={STEP_INDEX[variant][step]} />}
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            {step === 'details' && (
              <form key="details" onSubmit={onDetails} noValidate className="step-in">
                <Heading id={idOf('booking-focus')} ref={stepHeading} tabIndex={-1} className={headingClass}>
                  {booking.detailsHeading}
                </Heading>

                {/* Time first: the time they picked, so it's clear what the last button books. */}
                {timeFirst && slot && (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl bg-cream/70 py-1.5 pl-4 pr-1.5 text-[14.5px] leading-snug">
                    <CalendarDays size={19} className="shrink-0 text-ember-deep" aria-hidden />
                    <p className="min-w-0 flex-1 py-1.5">
                      <span className="font-semibold">{fmt.slotDay(slot, tz)}</span>
                      {`, ${fmt.time(slot, tz)} ${zoneName(tz, slot)} · ${CALL_MINUTES} min`}
                    </p>
                    <button
                      type="button"
                      onClick={back}
                      aria-label={booking.a11y.changeTime}
                      className="min-h-11 shrink-0 rounded-full px-3 text-[14px] font-semibold underline decoration-ink/30 underline-offset-4 transition hover:decoration-ink"
                    >
                      {booking.change}
                    </button>
                  </div>
                )}

                <fieldset className="mt-6" aria-describedby={errors.budget ? idOf('budget-err') : undefined}>
                  <legend className="text-[15px] font-semibold">{booking.budgetQuestion}</legend>
                  <div className="mt-3 grid gap-2.5 @lg:grid-cols-3">
                    {booking.budgets.map((b, i) => {
                      const on = budget === b.id;
                      return (
                        <label
                          key={b.id}
                          className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember has-[:focus-visible]:ring-offset-2 @lg:flex-col @lg:items-start @lg:gap-2.5 @lg:py-4 ${
                            on ? 'border-ink bg-ink text-cream shadow-[0_12px_24px_-14px_rgb(17_17_17/0.8)]' : 'border-ink/20 bg-white hover:border-ink/45 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-cream'
                          }`}
                        >
                          <input
                            id={idOf(`budget-${i}`)}
                            type="radio"
                            name="budget"
                            value={b.id}
                            checked={on}
                            required
                            aria-invalid={!!errors.budget}
                            onChange={() => pickBudget(b.id)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-ember bg-ember' : 'border-ink/45'}`}
                          >
                            {on && <Check size={12} strokeWidth={3.4} className="text-ink" />}
                          </span>
                          {b.label}
                        </label>
                      );
                    })}
                  </div>
                  {errors.budget && <ErrorText id={idOf('budget-err')}>{errors.budget}</ErrorText>}
                </fieldset>

                {budget === 'under' && (
                  <div className="step-in mt-5">
                    <label htmlFor={idOf('budget-amount')} className="text-[15px] font-semibold">
                      {booking.budgetAmountQuestion}
                    </label>
                    <div className="relative mt-3">
                      <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-ink/55">
                        $
                      </span>
                      <input
                        id={idOf('budget-amount')}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={20}
                        placeholder={booking.budgetAmountPlaceholder}
                        value={budgetAmount}
                        aria-required="true"
                        aria-invalid={!!errors.budgetAmount}
                        aria-describedby={errors.budgetAmount ? idOf('budget-amount-err') : undefined}
                        onChange={(ev) => {
                          setBudgetAmount(ev.target.value);
                          if (errors.budgetAmount) setErrors((x) => ({ ...x, budgetAmount: undefined }));
                        }}
                        className="field pl-8"
                      />
                    </div>
                    {errors.budgetAmount && <ErrorText id={idOf('budget-amount-err')}>{errors.budgetAmount}</ErrorText>}
                  </div>
                )}

                <div className="mt-6">
                  <label htmlFor={idOf('site')} className="text-[15px] font-semibold">
                    {booking.siteQuestion}
                  </label>
                  <div className="relative mt-3">
                    <Globe size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" aria-hidden />
                    <input
                      id={idOf('site')}
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder={booking.sitePlaceholder}
                      maxLength={200}
                      value={site}
                      disabled={noSite}
                      aria-required={!noSite}
                      onChange={(ev) => {
                        setSite(ev.target.value);
                        if (errors.site) setErrors((x) => ({ ...x, site: undefined }));
                      }}
                      aria-invalid={!!errors.site}
                      aria-describedby={errors.site ? idOf('site-err') : undefined}
                      className="field pl-11"
                    />
                  </div>
                  {errors.site && <ErrorText id={idOf('site-err')}>{errors.site}</ErrorText>}
                  <label className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink/80">
                    <input
                      id={idOf('no-site')}
                      type="checkbox"
                      checked={noSite}
                      onChange={(ev) => {
                        setNoSite(ev.target.checked);
                        if (errors.site) setErrors((x) => ({ ...x, site: undefined }));
                      }}
                      className="size-[18px] rounded accent-ink"
                    />
                    {booking.noSite}
                  </label>
                </div>

                <div className="mt-5 grid gap-4 @lg:grid-cols-2">
                  <Field id={idOf('f-name')} label={booking.fields.name} value={form.name} onValue={set('name')} error={errors.name} autoComplete="name" maxLength={120} required />
                  <Field
                    id={idOf('f-email')}
                    label={booking.fields.email}
                    value={form.email}
                    onValue={set('email')}
                    error={errors.email}
                    type="email"
                    inputMode="email"
                    maxLength={200}
                    autoComplete="email"
                    autoCapitalize="off"
                    spellCheck="false"
                    required
                  />
                  <PhoneField
                    id={idOf('f-phone')}
                    className="@lg:col-span-2"
                    country={country}
                    onCountry={setCountry}
                    value={form.phone}
                    onValue={set('phone')}
                    error={errors.phone}
                  />
                  {/* Spam trap: hidden from people and screen readers; bots fill it in. */}
                  <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                    <label htmlFor={idOf('f-hp')}>Leave this empty</label>
                    <input ref={honeypot} id={idOf('f-hp')} name="hp_x7" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                  </div>
                </div>

                <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-stone">
                  <Lock size={13} className="mt-[3px] shrink-0" aria-hidden /> {booking.privacy}
                </p>

                {timeFirst ? (
                  <>
                    {errors.submit && <ErrorText id={idOf('submit-err')}>{errors.submit}</ErrorText>}
                    <div className={actionRow}>
                      <button type="button" className={backBtn} onClick={back}>
                        <ArrowLeft size={16} aria-hidden /> {booking.back}
                      </button>
                      <button type="submit" className={mainBtn} aria-disabled={submitting} aria-busy={submitting}>
                        {confirmLabel}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <p className="hidden text-[13px] text-stone @lg:block">{booking.detailsNote}</p>
                    <button type="submit" className={`${mainBtn} @lg:ml-auto`}>
                      {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                    </button>
                  </div>
                )}
              </form>
            )}

            {step === 'time' && (
              <div key="time" className="step-in">
                <Heading id={idOf('booking-focus')} ref={stepHeading} tabIndex={-1} className={headingClass}>
                  {booking.timeHeading}
                </Heading>
                <div className="mt-5">
                  <TimeZoneSelect id={idOf('tz')} value={tz} deviceZone={deviceTz} onChange={changeTz} />
                </div>

                {!ready && slotsStatus !== 'error' && (
                  <p role="status" className="mt-8 flex min-h-[260px] items-start gap-2.5 text-[15px] text-stone">
                    <LoaderCircle size={18} className="mt-0.5 animate-[spin_0.8s_linear_infinite]" aria-hidden />
                    {booking.slotsLoading}
                  </p>
                )}

                {slotsStatus === 'error' && (
                  <div role="alert" className="mt-8 min-h-[200px]">
                    <p className="text-[15px] text-stone">{booking.slotsError}</p>
                    <button type="button" className="btn-ghost mt-4" onClick={() => loadSlots({ fresh: true })}>
                      {booking.retry}
                    </button>
                  </div>
                )}

                {ready && !anyOpen && (
                  <div role="status" className="mt-8 min-h-[200px]">
                    <p className="text-[15px] text-stone">{booking.noSlotsAtAll}</p>
                    <button type="button" className="btn-ghost mt-4" onClick={() => loadSlots({ fresh: true })}>
                      {booking.retry}
                    </button>
                  </div>
                )}

                {ready && month && anyOpen && (
                  <div className="mt-6 grid gap-7 @lg:grid-cols-[1.1fr_1fr] @lg:gap-8">
                    <Calendar
                      now={now}
                      timeZone={tz}
                      month={month}
                      onMonth={setMonth}
                      selected={day}
                      onSelect={(d) => {
                        if (submitting) return;
                        setDay(d);
                        setSlot(null);
                        if (errors.submit) setErrors((x) => ({ ...x, submit: undefined }));
                      }}
                    />
                    <div>
                      <p className="text-[15px] font-semibold">{day ? fmt.dayLong(day) : booking.chooseDay}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-stone">
                        <Globe size={13} aria-hidden /> {`${booking.timesIn} ${zoneName(tz, slots[0] ?? now)}`}
                      </p>
                      {slots.length === 0 && <p className="mt-4 text-[14px] text-stone">{booking.noSlots}</p>}
                      {slotGroups.map((g) => (
                        <div key={g.label} className="mt-4">
                          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-stone">{g.label}</p>
                          <div role="group" aria-label={`${booking.a11y.times}, ${g.label}`} className="mt-2 grid grid-cols-3 gap-2 @lg:grid-cols-2">
                            {g.slots.map((s) => {
                              const on = !!slot && slot.getTime() === s.getTime();
                              return (
                                <button
                                  key={s.getTime()}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => pickSlot(s)}
                                  className={`h-11 rounded-xl text-[14.5px] font-semibold transition ${
                                    on ? 'bg-ink text-cream shadow-[0_8px_18px_-8px_rgb(17_17_17/0.7)]' : 'bg-white ring-1 ring-ink/20 hover:ring-ink/50'
                                  }`}
                                >
                                  {fmt.time(s, tz)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* The time they're about to confirm, so it's clear what the button books. */}
                <div aria-live="polite">
                  {slot && (
                    <p className="mt-7 flex items-center gap-3 rounded-2xl bg-cream/70 px-4 py-3 text-[14.5px] leading-snug">
                      <CalendarDays size={19} className="shrink-0 text-ember-deep" aria-hidden />
                      <span>
                        <span className="font-semibold">{fmt.slotDay(slot, tz)}</span>
                        {`, ${fmt.time(slot, tz)} ${zoneName(tz, slot)} · ${CALL_MINUTES} min`}
                      </span>
                    </p>
                  )}
                </div>
                {errors.submit && <ErrorText id={idOf('time-err')}>{errors.submit}</ErrorText>}

                {timeFirst ? (
                  // Picking a time sends nothing: the details come next.
                  <div className="mt-6 flex justify-end">
                    <button ref={confirmBtn} type="button" className={mainBtn} disabled={!slot} onClick={toDetails}>
                      {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div className={actionRow}>
                    <button type="button" className={backBtn} onClick={back}>
                      <ArrowLeft size={16} aria-hidden /> {booking.back}
                    </button>
                    <button
                      ref={confirmBtn}
                      type="button"
                      className={mainBtn}
                      disabled={!slot}
                      aria-disabled={submitting}
                      aria-busy={submitting}
                      onClick={book}
                    >
                      {confirmLabel}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'done' && booked && (
              <div key="done" className="step-in py-2 text-center sm:py-4">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-go/10">
                  <CircleCheck size={34} className="text-go" aria-hidden />
                </span>
                <Heading id={idOf('booking-focus')} ref={stepHeading} tabIndex={-1} className="mt-5 font-serif text-[2.4rem] leading-none outline-none">
                  {`${booking.done.heading}, ${booked.name.split(/\s+/)[0]}.`}
                </Heading>
                <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-stone">
                  {`${booking.done.body} `}
                  <strong className="font-semibold text-ink">{booked.email}</strong>.
                </p>

                <dl className="mx-auto mt-6 grid max-w-sm gap-2.5 rounded-2xl bg-cream/70 p-4 text-left text-[14.5px]">
                  <div className="flex items-center gap-3">
                    <dt className="sr-only">{booking.a11y.date}</dt>
                    <CalendarDays size={17} className="text-ember-deep" aria-hidden />
                    <dd className="font-semibold">{fmt.slotDay(booked.start, booked.timeZone)}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <dt className="sr-only">{booking.a11y.time}</dt>
                    <Clock size={17} className="text-ember-deep" aria-hidden />
                    <dd>{`${fmt.time(booked.start, booked.timeZone)} ${zoneName(booked.timeZone, booked.start)} · ${booking.card.title}`}</dd>
                  </div>
                </dl>

                <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left text-[15px] leading-snug">
                  {booking.done.next.map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-cream">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className="btn-cta btn-cta-ink btn-cta-sm"
                    onClick={() => downloadIcs(buildIcs({ ...booked, durationMin: CALL_MINUTES }, brand.name), `${brand.name}-call.ics`)}
                  >
                    <CalendarPlus size={16} aria-hidden /> {booking.done.addToCalendar}
                  </button>
                  <button type="button" className="btn-ghost" onClick={reset}>
                    {booking.done.reschedule}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ labels, index }: { labels: string[]; index: number }) {
  return (
    <ol className="flex shrink-0 items-center gap-1.5" aria-label={booking.a11y.stepOf(index + 1, labels.length)}>
      {labels.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5" aria-current={i === index ? 'step' : undefined}>
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-ember' : i < index ? 'w-3 bg-ink' : 'w-3 bg-ink/15'}`}
            aria-hidden
          />
          <span className={`sr-only text-[12px] font-semibold @lg:not-sr-only ${i === index ? 'text-ink' : 'text-stone'}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function ErrorText({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className="mt-2 text-[13.5px] font-medium text-ember-deep">
      {children}
    </p>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onValue: (v: string) => void;
  error?: string;
  hint?: string;
  className?: string;
};

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: Omit<FieldProps, 'value' | 'onValue'> & { required?: boolean; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px] font-semibold">
        {label}
        {!required && <span className="text-[12px] font-normal text-stone">{booking.fields.optional}</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-stone">
          {hint}
        </p>
      )}
      {error && <ErrorText id={`${id}-err`}>{error}</ErrorText>}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined;
}

function Field({ id, label, value, onValue, error, hint, className, required, ...rest }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input
        id={id}
        value={value}
        onChange={(ev) => onValue(ev.target.value)}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className="field"
        {...rest}
      />
    </FieldShell>
  );
}
