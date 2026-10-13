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
type SlotsStatus = 'idle' | 'loading' | 'ready' | 'error';
type FormState = { name: string; email: string; phone: string };
type Errors = Partial<Record<keyof FormState | 'siteStatus' | 'site' | 'submit', string>>;
/** What was actually sent, so the confirmation can't drift from the request. */
type Booked = { start: Date; name: string; email: string; timeZone: string };

const EMPTY: FormState = { name: '', email: '', phone: '' };
const STEP_INDEX: Record<Step, number> = { details: 0, time: 1, done: 2 };
/** Where to put the cursor for each step-1 problem, in the order they appear. */
const FIELD_IDS = { siteStatus: 'site-status-0', site: 'site', name: 'f-name', email: 'f-email', phone: 'f-phone' } as const;
/** Free times older than this are re-checked in the background. */
const SLOTS_MAX_AGE_MS = 2 * 60_000;
const e = booking.errors;

/**
 * The booking card, in two steps: whether they have a website and how to
 * reach them, then a calendar of your free times (from GoHighLevel when
 * connected). Picking a time and confirming books the call.
 */
export function BookingWidget() {
  const [step, setStep] = useState<Step>('details');
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
  /** The spam trap's value, kept after step 1 (where the field lives) closes. */
  const trapped = useRef('');
  /** The pixel's Lead counts once per visit, even if they go back and change their details. */
  const leadTracked = useRef(false);
  const prevStep = useRef(step);
  const slotsLoading = useRef<Promise<void> | null>(null);
  const slotsLoadedAt = useRef(0);

  // Move focus to each new step's heading, and bring the card back into view
  // if the step change left the visitor scrolled past its top. Comparing with
  // the previous step (not a mount flag) keeps this right under StrictMode.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    stepHeading.current?.focus({ preventScroll: true });
    const top = card.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) card.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  // The page is prerendered, so a visitor on a slow phone can fill in step 1
  // before the script loads, and browsers restore form fields on back/forward.
  // Take whatever is already in the fields as the starting state.
  useLayoutEffect(() => {
    const pickedSite = document.querySelector<HTMLInputElement>('input[name="site-status"]:checked')?.value;
    if (pickedSite) setSiteStatus(pickedSite as SiteStatus);
    const typed = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
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

  // While they pick a time, keep the clock moving (times drop off as GHL stops
  // accepting them) and re-check GHL every couple of minutes.
  useEffect(() => {
    if (step !== 'time') return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      if (slotsLoadedAt.current && Date.now() - slotsLoadedAt.current > SLOTS_MAX_AGE_MS) loadSlots({ background: true });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [step]);

  // Keep the chosen day and time valid as the clock moves and fresh times arrive.
  useEffect(() => {
    // Once booked, nothing on the confirmation depends on the clock.
    if (step === 'done' || slotsStatus !== 'ready') return;
    if (!day || !isBookable(day, now, tz)) {
      const d = firstBookableDay(now, tz);
      setDay(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    if (slot && !isSlotOpen(slot, now)) {
      setSlot(null);
      // Say why the picked time went away, so it doesn't just vanish.
      if (step === 'time') setErrors({ submit: e.slotGone });
    }
    // Only re-check when the clock moves or new times arrive.
  }, [now, slotsTick, slotsStatus]);

  const go = (s: Step) => {
    setErrors({});
    setStep(s);
  };

  /** Filling in step 1 means they're about to book: load the free times now, so the calendar is ready. */
  function warmUp() {
    if (slotsStatus === 'idle') loadSlots();
  }

  function onDetails(ev: FormEvent) {
    ev.preventDefault();
    const next: Errors = {};
    if (!siteStatus) next.siteStatus = e.siteStatus;
    else if (!noSite && !looksLikeUrl(site)) next.site = site.trim() ? e.siteInvalid : e.siteMissing;
    if (!form.name.trim()) next.name = e.name;
    if (!looksLikeEmail(form.email)) next.email = form.email.trim() ? e.emailInvalid : e.emailMissing;
    if (!looksLikePhone(form.phone)) next.phone = form.phone.trim() ? e.phoneInvalid : e.phoneMissing;
    setErrors(next);
    const first = (Object.keys(FIELD_IDS) as (keyof typeof FIELD_IDS)[]).find((k) => next[k]);
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    trapped.current = honeypot.current?.value ?? '';
    if (!leadTracked.current) {
      leadTracked.current = true;
      trackPixel('Lead');
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
    // On phones the slot list is long; bring the confirm button up so the last step is obvious.
    if (window.innerWidth < 768) {
      requestAnimationFrame(() => confirmBtn.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  }

  async function book() {
    if (submitting || !slot || !siteStatus) return;
    // Re-check against the real current time (a tab can sit open until the
    // picked time is too soon to book or has passed).
    if (!isSlotOpen(slot, new Date())) {
      setSlot(null);
      setNow(new Date());
      setErrors({ submit: e.slotGone });
      loadSlots({ fresh: true, background: true });
      return;
    }
    const request = { start: slot, name: form.name.trim(), email: form.email.trim(), timeZone: tz };
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
      trackPixel('Schedule');
      setBooked(request);
      go('done');
    } catch (err) {
      if (err instanceof SlotTakenError) {
        // Someone else took it a moment ago: refresh the times and let them pick again.
        setSlot(null);
        setErrors({ submit: e.slotTaken });
        loadSlots({ fresh: true, background: true });
      } else {
        setErrors({ submit: e.submit });
      }
    } finally {
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

  /** Back is ignored while a booking is being sent. */
  function back() {
    if (!submitting) go('details');
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

  // Back sits under the main button on phones, beside it from 640px.
  const actionRow = 'mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between';
  const mainBtn = 'btn-cta w-full sm:w-auto';
  const backBtn = 'btn-ghost justify-center sm:justify-start';

  return (
    <div ref={card} id="booking-card" className="glass-soft rounded-[32px] p-1.5 sm:p-2">
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
          {step !== 'done' && <Stepper index={STEP_INDEX[step]} />}
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          {step === 'details' && (
            <form key="details" onSubmit={onDetails} noValidate className="step-in">
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="font-serif text-[1.85rem] leading-tight outline-none">
                {booking.detailsHeading}
              </h3>

              <Choices
                name="site-status"
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
                gridClass="sm:grid-cols-3"
              />

              {siteStatus && !noSite && (
                <div className="step-in mt-4">
                  <label htmlFor="site" className="text-[14px] font-semibold">
                    {booking.siteUrlLabel}
                  </label>
                  <div className="relative mt-2">
                    <Globe size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" aria-hidden />
                    <input
                      id="site"
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
                      aria-describedby={errors.site ? 'site-err' : undefined}
                      className="field pl-11"
                    />
                  </div>
                  {errors.site && <ErrorText id="site-err">{errors.site}</ErrorText>}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field id="f-name" label={booking.fields.name} value={form.name} onValue={set('name')} error={errors.name} autoComplete="name" maxLength={120} required />
                <Field
                  id="f-email"
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
                <PhoneField className="sm:col-span-2" country={country} onCountry={setCountry} value={form.phone} onValue={set('phone')} error={errors.phone} />
                {/* Spam trap: hidden from people and screen readers; bots fill it in. */}
                <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor="f-hp">Leave this empty</label>
                  <input ref={honeypot} id="f-hp" name="hp_x7" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-stone">
                <Lock size={13} className="mt-[3px] shrink-0" aria-hidden /> {booking.privacy}
              </p>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="hidden text-[13px] text-stone sm:block">{booking.detailsNote}</p>
                <button type="submit" className={`${mainBtn} sm:ml-auto`}>
                  {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </form>
          )}

          {step === 'time' && (
            <div key="time" className="step-in">
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="font-serif text-[1.85rem] leading-tight outline-none">
                {booking.timeHeading}
              </h3>
              <div className="mt-5">
                <TimeZoneSelect value={tz} deviceZone={deviceTz} onChange={changeTz} />
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
                <div className="mt-6 grid gap-7 md:grid-cols-[1.1fr_1fr] md:gap-8">
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
                        <div role="group" aria-label={`${booking.a11y.times}, ${g.label}`} className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-2">
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
              {errors.submit && <ErrorText id="time-err">{errors.submit}</ErrorText>}

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
                  {submitting ? (
                    <>
                      <LoaderCircle size={18} className="animate-[spin_0.8s_linear_infinite]" aria-hidden /> {booking.submitting}
                    </>
                  ) : (
                    <>
                      {booking.submit} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && booked && (
            <div key="done" className="step-in py-2 text-center sm:py-4">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-go/10">
                <CircleCheck size={34} className="text-go" aria-hidden />
              </span>
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="mt-5 font-serif text-[2.4rem] leading-none outline-none">
                {`${booking.done.heading}, ${booked.name.split(/\s+/)[0]}.`}
              </h3>
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

/** One question's radio answers, as cards in a grid. */
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
              className={`relative flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-[15px] font-semibold leading-snug transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember has-[:focus-visible]:ring-offset-2 sm:px-4 ${
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

function Stepper({ index }: { index: number }) {
  return (
    <ol className="flex shrink-0 items-center gap-1.5" aria-label={booking.a11y.stepOf(index + 1, booking.steps.length)}>
      {booking.steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5" aria-current={i === index ? 'step' : undefined}>
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-ember' : i < index ? 'w-3 bg-ink' : 'w-3 bg-ink/15'}`}
            aria-hidden
          />
          <span className={`sr-only text-[12px] font-semibold sm:not-sr-only ${i === index ? 'text-ink' : 'text-stone'}`}>{s}</span>
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
