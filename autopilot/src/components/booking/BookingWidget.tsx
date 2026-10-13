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
  type SiteStatus,
} from '../../lib/booking';
import { guessCountry, toInternational } from '../../lib/countries';
import { trackPixel } from '../../lib/pixel';
import { Calendar } from './Calendar';
import { PhoneField } from './PhoneField';
import { TimeZoneSelect } from './TimeZoneSelect';

type Step = 'details' | 'time' | 'done';
/** `section`: the card in #book, details first. `hero`: the card under the headline, time first. */
type Variant = 'hero' | 'section';
type SlotsStatus = 'idle' | 'loading' | 'ready' | 'error';
type FormState = { name: string; email: string; phone: string };
type Errors = Partial<Record<keyof FormState | 'siteStatus' | 'site' | 'submit', string>>;
/** What was actually sent, so the confirmation can't drift from the request. */
type Booked = { start: Date; name: string; email: string; timeZone: string };

const EMPTY: FormState = { name: '', email: '', phone: '' };
const STEPS: Record<Variant, Step[]> = { section: ['details', 'time', 'done'], hero: ['time', 'details', 'done'] };
/** Free times older than this are re-checked in the background. */
const SLOTS_MAX_AGE_MS = 2 * 60_000;
const e = booking.errors;

/**
 * The booking card. Two steps, the call's time and the visitor's details (do
 * they have a website, how to reach them), in either order: the card in #book
 * asks for the details first, the one in the hero shows the calendar of your
 * free times (from GoHighLevel when connected) first. Only the last step's
 * button books the call, once both steps are complete; nothing is sent before.
 *
 * Both cards are on the page at once, so the hero card's ids start with
 * "hero-". The #book card keeps the plain ids that goToBooking() looks for.
 */
export function BookingWidget({ variant = 'section' }: { variant?: Variant }) {
  const timeFirst = variant === 'hero';
  const steps = STEPS[variant];
  const [step, setStep] = useState<Step>(steps[0]);
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);
  const [site, setSite] = useState('');
  const noSite = siteStatus === 'new';
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
  /** The spam trap's value, kept after the details step (where the field lives) closes. */
  const trapped = useRef('');
  /** Set the moment a booking starts sending (state lands a render later), so a double click or Enter can't send it twice. */
  const sending = useRef(false);
  const prevStep = useRef(step);
  /** Set when the card changes step on its own while they're elsewhere: no focus or scroll for that one. */
  const quietStep = useRef(false);
  const slotsLoading = useRef<Promise<void> | null>(null);
  const slotsLoadedAt = useRef(0);

  /** This card's id for `name`. A fixed prefix, not useId, so the prerendered page and the hydrated one match. */
  const idFor = (name: string) => (timeFirst ? `hero-${name}` : name);
  /** Where to put the cursor for each details problem, in the order they appear. */
  const fieldIds = { siteStatus: idFor('site-status-0'), site: idFor('site'), name: idFor('f-name'), email: idFor('f-email'), phone: idFor('f-phone') };

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
  // starting state (only this card's: the other one has its own).
  useLayoutEffect(() => {
    const root = card.current;
    const pickedSite = root?.querySelector<HTMLInputElement>(`input[name="${idFor('site-status')}"]:checked`)?.value;
    if (pickedSite) setSiteStatus(pickedSite as SiteStatus);
    const typed = (name: string) => root?.querySelector<HTMLInputElement>(`#${idFor(name)}`)?.value ?? '';
    if (typed('site')) setSite(typed('site'));
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

  // The hero card opens on the calendar, so fetch the free times as soon as
  // the script runs. Effects don't run while prerendering, so the static page
  // shows the loading line.
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

  // While they pick a time (or, time-first, while the picked time waits for
  // their details), keep the clock moving (times drop off as GHL stops
  // accepting them) and re-check GHL every couple of minutes.
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
    // While a booking is being sent, the server has the final say on the time.
    if (slot && !isSlotOpen(slot, now) && !sending.current) {
      setSlot(null);
      // Say why the picked time went away, so it doesn't just vanish. Time-first,
      // a time lost while they type their details sends them back to pick another.
      if (timeFirst && step === 'details') {
        // This happens on a timer, not a click. If they've moved on (to the
        // other card, or further down the page), turn this card back without
        // pulling focus or the page up to it; they'll see why when they return.
        quietStep.current = !card.current?.contains(document.activeElement);
        go('time');
        setErrors({ submit: e.slotGone });
      } else if (step === 'time') {
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

  /** Checks every detail, shows what's wrong and puts the cursor on the first problem. True when all is well. */
  function checkDetails() {
    const next: Errors = {};
    if (!siteStatus) next.siteStatus = e.siteStatus;
    else if (!noSite && !looksLikeUrl(site)) next.site = site.trim() ? e.siteInvalid : e.siteMissing;
    if (!form.name.trim()) next.name = e.name;
    if (!looksLikeEmail(form.email)) next.email = form.email.trim() ? e.emailInvalid : e.emailMissing;
    if (!looksLikePhone(form.phone)) next.phone = form.phone.trim() ? e.phoneInvalid : e.phoneMissing;
    setErrors(next);
    const first = (Object.keys(fieldIds) as (keyof typeof fieldIds)[]).find((k) => next[k]);
    if (first) document.getElementById(fieldIds[first])?.focus();
    return !first;
  }

  /** Details first: their details are fine, so on to the calendar. Nothing is sent yet. */
  function onDetails(ev: FormEvent) {
    ev.preventDefault();
    if (!checkDetails()) return;
    trapped.current = honeypot.current?.value ?? '';
    setNow(new Date());
    if (slotsStatus === 'idle' || slotsStatus === 'error') loadSlots();
    else if (Date.now() - slotsLoadedAt.current > SLOTS_MAX_AGE_MS) loadSlots({ background: true });
    go('time');
  }

  /** Time first: hold the picked time and ask for their details. Nothing is sent yet. */
  function onTimeChosen() {
    if (!slot) return;
    if (!isSlotOpen(slot, new Date())) {
      loseSlot(e.slotGone);
      return;
    }
    go('details');
  }

  /** Time first: the details complete the form, so submitting them books the call. */
  function onFinish(ev: FormEvent) {
    ev.preventDefault();
    if (sending.current || !checkDetails()) return;
    trapped.current = honeypot.current?.value ?? '';
    book();
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

  /**
   * The picked time can't be booked any more: clear it, say why and fetch
   * fresh times. Time-first, that means back to the calendar, with their
   * details still filled in. (go() clears errors, so the message comes after.)
   */
  function loseSlot(message: string) {
    setSlot(null);
    setNow(new Date());
    if (timeFirst) go('time');
    setErrors({ submit: message });
    loadSlots({ fresh: true, background: true });
  }

  /**
   * The only place a booking is sent (GHL, the sheet and WhatsApp, through
   * api/book.ts), and only from the last step, with the details checked and
   * a time picked.
   */
  async function book() {
    if (sending.current || !siteStatus) return;
    // Re-check against the real current time (a tab can sit open until the
    // picked time is too soon to book or has passed).
    if (!slot || !isSlotOpen(slot, new Date())) {
      loseSlot(e.slotGone);
      return;
    }
    const request = { start: slot, name: form.name.trim(), email: form.email.trim(), timeZone: tz };
    sending.current = true;
    setErrors({});
    setSubmitting(true);
    try {
      await submitBooking(
        {
          siteStatus,
          website: noSite ? null : normaliseUrl(site),
          durationMin: CALL_MINUTES,
          phone: toInternational(country, form.phone),
          ...request,
        },
        trapped.current,
      );
      // The whole form went through and the call is booked: only now does the ad pixel hear of it.
      trackPixel('Lead');
      trackPixel('Schedule');
      setBooked(request);
      go('done');
    } catch (err) {
      // Someone else took it a moment ago: refresh the times and let them pick again.
      if (err instanceof SlotTakenError) loseSlot(e.slotTaken);
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

  /** Back to the previous step (time-first, also "Change"). Ignored while a booking is being sent. */
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

  // The same card sits in the hero's column and in #book, so its layout
  // follows its own width (container queries), not the screen's.
  // Back sits under the main button in a narrow card, beside it in a wider one.
  const actionRow = 'mt-6 flex flex-col-reverse items-stretch gap-3 @md:flex-row @md:items-center @md:justify-between';
  const mainBtn = 'btn-cta w-full @md:w-auto';
  const backBtn = 'btn-ghost justify-center @md:justify-start';
  const headingClass = 'font-serif text-[1.85rem] leading-tight outline-none';
  // Under the page's h1 in the hero, under the section's h2 in #book.
  const Heading = timeFirst ? 'h2' : 'h3';

  /** "Thursday, October 15, 3:00 PM Eastern Daylight Time · 20 min" */
  const timeLine = (s: Date) => (
    <>
      <span className="font-semibold">{fmt.slotDay(s, tz)}</span>
      {`, ${fmt.time(s, tz)} ${zoneName(tz, s)} · ${CALL_MINUTES} min`}
    </>
  );
  const bookLabel = submitting ? (
    <>
      <LoaderCircle size={18} className="animate-[spin_0.8s_linear_infinite]" aria-hidden /> {booking.submitting}
    </>
  ) : (
    <>
      {booking.submit} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
    </>
  );

  return (
    <div ref={card} id={idFor('booking-card')} className="@container glass-soft rounded-[32px] p-1.5 sm:p-2">
      <div className="overflow-hidden rounded-[26px] bg-white/75 ring-1 ring-ink/5">
        {/* Card header */}
        <div className="flex items-center justify-between gap-4 border-b border-ink/[0.07] px-5 py-4 @md:px-7">
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
          {step !== 'done' && <Stepper index={steps.indexOf(step)} labels={timeFirst ? booking.stepsTimeFirst : booking.steps} />}
        </div>

        <div className="px-5 py-6 @md:px-7 @md:py-7">
          {step === 'details' && (
            <form key="details" onSubmit={timeFirst ? onFinish : onDetails} noValidate className="step-in">
              <Heading id={idFor('booking-focus')} ref={stepHeading} tabIndex={-1} className={headingClass}>
                {booking.detailsHeading}
              </Heading>

              {/* Time first: the time they picked, held until they confirm below. */}
              {timeFirst && slot && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-cream/70 py-2.5 pl-4 pr-2.5 text-[14.5px] leading-snug">
                  <CalendarDays size={19} className="shrink-0 text-ember-deep" aria-hidden />
                  <p className="min-w-0 flex-1">
                    <span className="sr-only">{`${booking.heldTime}: `}</span>
                    {timeLine(slot)}
                  </p>
                  <button type="button" onClick={back} aria-label={booking.a11y.changeTime} className="btn-ghost h-9 shrink-0 px-3.5 text-[14px]">
                    {booking.changeTime}
                  </button>
                </div>
              )}

              <Choices
                name={idFor('site-status')}
                legend={booking.siteQuestion}
                options={booking.siteOptions}
                value={siteStatus}
                error={errors.siteStatus}
                onPick={(id) => {
                  setSiteStatus(id);
                  setErrors((x) => ({ ...x, siteStatus: undefined, site: id === 'new' ? undefined : x.site }));
                  warmUp();
                }}
                className="mt-6"
                gridClass="@md:grid-cols-3"
              />

              {siteStatus && !noSite && (
                <div className="step-in mt-4">
                  <label htmlFor={fieldIds.site} className="text-[14px] font-semibold">
                    {booking.siteUrlLabel}
                  </label>
                  <div className="relative mt-2">
                    <Globe size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" aria-hidden />
                    <input
                      id={fieldIds.site}
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder={booking.sitePlaceholder}
                      maxLength={200}
                      value={site}
                      aria-required="true"
                      onChange={(ev) => {
                        setSite(ev.target.value);
                        if (errors.site) setErrors((x) => ({ ...x, site: undefined }));
                      }}
                      aria-invalid={!!errors.site}
                      aria-describedby={errors.site ? idFor('site-err') : undefined}
                      className="field pl-11"
                    />
                  </div>
                  {errors.site && <ErrorText id={idFor('site-err')}>{errors.site}</ErrorText>}
                </div>
              )}

              <div className="mt-6 grid gap-4 @md:grid-cols-2">
                <Field id={fieldIds.name} label={booking.fields.name} value={form.name} onValue={set('name')} error={errors.name} autoComplete="name" maxLength={120} required />
                <Field
                  id={fieldIds.email}
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
                  id={fieldIds.phone}
                  className="@md:col-span-2"
                  country={country}
                  onCountry={setCountry}
                  value={form.phone}
                  onValue={set('phone')}
                  error={errors.phone}
                />
                {/* Spam trap: hidden from people and screen readers; bots fill it in. */}
                <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor={idFor('f-hp')}>Leave this empty</label>
                  <input ref={honeypot} id={idFor('f-hp')} name="hp_x7" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-stone">
                <Lock size={13} className="mt-[3px] shrink-0" aria-hidden /> {booking.privacy}
              </p>

              {timeFirst ? (
                <>
                  {errors.submit && <ErrorText id={idFor('submit-err')}>{errors.submit}</ErrorText>}
                  <div className={actionRow}>
                    <button type="button" className={backBtn} onClick={back}>
                      <ArrowLeft size={16} aria-hidden /> {booking.back}
                    </button>
                    <button type="submit" className={mainBtn} aria-disabled={submitting} aria-busy={submitting}>
                      {bookLabel}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="hidden text-[13px] text-stone @md:block">{booking.detailsNote}</p>
                  <button type="submit" className={`${mainBtn} @md:ml-auto`}>
                    {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                  </button>
                </div>
              )}
            </form>
          )}

          {step === 'time' && (
            <div key="time" className="step-in">
              <Heading id={idFor('booking-focus')} ref={stepHeading} tabIndex={-1} className={headingClass}>
                {booking.timeHeading}
              </Heading>
              <div className="mt-5">
                <TimeZoneSelect id={idFor('tz')} value={tz} deviceZone={deviceTz} onChange={changeTz} />
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

              {/* Calendar and times side by side once the card is wide enough for a usable month grid. */}
              {ready && month && anyOpen && (
                <div className="mt-6 grid gap-7 @min-[30rem]:grid-cols-[1.1fr_1fr] @min-[30rem]:gap-8">
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
                        <div role="group" aria-label={`${booking.a11y.times}, ${g.label}`} className="mt-2 grid grid-cols-3 gap-2 @min-[30rem]:grid-cols-2">
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

              {/* The time they're about to confirm (or, time-first, carry on with), so it's clear what the button does. */}
              <div aria-live="polite">
                {slot && (
                  <p className="mt-7 flex items-center gap-3 rounded-2xl bg-cream/70 px-4 py-3 text-[14.5px] leading-snug">
                    <CalendarDays size={19} className="shrink-0 text-ember-deep" aria-hidden />
                    <span>{timeLine(slot)}</span>
                  </p>
                )}
              </div>
              {errors.submit && <ErrorText id={idFor('time-err')}>{errors.submit}</ErrorText>}

              {timeFirst ? (
                <div className="mt-6 flex @md:justify-end">
                  <button ref={confirmBtn} type="button" className={mainBtn} disabled={!slot} onClick={onTimeChosen}>
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
                    {bookLabel}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'done' && booked && (
            <div key="done" className="step-in py-2 text-center @md:py-4">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-go/10">
                <CircleCheck size={34} className="text-go" aria-hidden />
              </span>
              <Heading id={idFor('booking-focus')} ref={stepHeading} tabIndex={-1} className="mt-5 font-serif text-[2.4rem] leading-none outline-none">
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
  );
}

/** One question's radio answers, as cards in a grid. `name` also prefixes the radios' ids. */
function Choices<T extends string>({
  name,
  legend,
  options,
  value,
  onPick,
  error,
  className = '',
  gridClass = '',
}: {
  name: string;
  legend: string;
  options: readonly { id: T; label: string }[];
  value: T | null;
  onPick: (id: T) => void;
  error?: string;
  className?: string;
  gridClass?: string;
}) {
  const errId = `${name}-err`;
  return (
    <fieldset className={className} aria-describedby={error ? errId : undefined}>
      <legend className="text-[15px] font-semibold">{legend}</legend>
      <div className={`mt-3 grid gap-2.5 ${gridClass}`}>
        {options.map((o, i) => {
          const on = value === o.id;
          return (
            <label
              key={o.id}
              className={`relative flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-[15px] font-semibold leading-snug transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember has-[:focus-visible]:ring-offset-2 @md:px-4 ${
                on ? 'border-ink bg-ink text-cream shadow-[0_12px_24px_-14px_rgb(17_17_17/0.8)]' : 'border-ink/20 bg-white hover:border-ink/45'
              }`}
            >
              <input
                id={`${name}-${i}`}
                type="radio"
                name={name}
                value={o.id}
                checked={on}
                required
                aria-invalid={!!error}
                onChange={() => onPick(o.id)}
                className="sr-only"
              />
              <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-ember bg-ember' : 'border-ink/45'}`}>
                {on && <Check size={12} strokeWidth={3.4} className="text-ink" />}
              </span>
              {o.label}
            </label>
          );
        })}
      </div>
      {error && <ErrorText id={errId}>{error}</ErrorText>}
    </fieldset>
  );
}

/** Progress dots with the step names, in this card's order. */
function Stepper({ index, labels }: { index: number; labels: readonly string[] }) {
  return (
    <ol className="flex shrink-0 items-center gap-1.5" aria-label={booking.a11y.stepOf(index + 1, labels.length)}>
      {labels.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5" aria-current={i === index ? 'step' : undefined}>
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-ember' : i < index ? 'w-3 bg-ink' : 'w-3 bg-ink/15'}`}
            aria-hidden
          />
          <span className={`sr-only text-[12px] font-semibold @md:not-sr-only ${i === index ? 'text-ink' : 'text-stone'}`}>{s}</span>
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
