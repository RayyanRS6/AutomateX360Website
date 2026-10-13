import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, Check, CircleCheck, Clock, Globe, Hand, LoaderCircle, Lock } from 'lucide-react';
import { booking, brand } from '../../content';
import {
  CALL_MINUTES,
  buildIcs,
  downloadIcs,
  firstBookableDay,
  fmt,
  getSlots,
  isBookable,
  isSlotOpen,
  localTimeZone,
  looksLikeEmail,
  looksLikeUrl,
  normaliseUrl,
  submitBooking,
  timeZoneLabel,
  type BudgetId,
} from '../../lib/booking';
import { Calendar } from './Calendar';

type Step = 'qualify' | 'notfit' | 'time' | 'details' | 'done';
type FormState = { name: string; email: string; phone: string; business: string; notes: string };
type Errors = Partial<Record<keyof FormState | 'budget' | 'site' | 'submit', string>>;
/** What was actually sent, so the confirmation can't drift from the request. */
type Booked = { start: Date; name: string; email: string; business: string };

const EMPTY: FormState = { name: '', email: '', phone: '', business: '', notes: '' };
const STEP_INDEX: Record<Step, number> = { qualify: 0, notfit: 0, time: 1, details: 2, done: 3 };
const e = booking.errors;

/**
 * The booking card: two qualifying questions, then a calendar, then contact
 * details. Anyone under the minimum budget is stopped politely before they
 * ever see a time slot.
 */
export function BookingWidget() {
  const [step, setStep] = useState<Step>('qualify');
  const [budget, setBudget] = useState<BudgetId | null>(null);
  const [site, setSite] = useState('');
  const [noSite, setNoSite] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState<Date | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  const card = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const continueBtn = useRef<HTMLButtonElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const prevStep = useRef(step);

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

  // The page is prerendered, so a visitor on a slow phone can answer step 1
  // before the script loads, and browsers restore form fields on back/forward.
  // Take whatever is already in the fields as the starting state.
  useLayoutEffect(() => {
    const picked = document.querySelector<HTMLInputElement>('input[name="budget"]:checked');
    if (picked) setBudget(picked.value as BudgetId);
    const siteField = document.getElementById('site') as HTMLInputElement | null;
    if (siteField?.value) setSite(siteField.value);
    if ((document.getElementById('no-site') as HTMLInputElement | null)?.checked) setNoSite(true);
  }, []);

  // A tab left open for hours or days must not offer times that have passed.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);
  useEffect(() => {
    // Once booked, nothing on the confirmation depends on the clock.
    if (step === 'done') return;
    if (day && !isBookable(day, now)) {
      const d = firstBookableDay(now);
      setDay(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    if (slot && !isSlotOpen(slot, now)) {
      setSlot(null);
      // The details step needs a slot: send the visitor back to pick another.
      if (step === 'details') {
        setStep('time');
        setErrors({ submit: e.slotGone });
      }
    }
    // Only re-check when the clock moves; day/slot changes are already valid.
  }, [now]);

  const go = (s: Step) => {
    setErrors({});
    setStep(s);
  };

  function onQualify(ev: FormEvent) {
    ev.preventDefault();
    const next: Errors = {};
    if (!budget) next.budget = e.budget;
    if (!noSite && !looksLikeUrl(site)) next.site = site.trim() ? e.siteInvalid : e.siteMissing;
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.budget ? 'budget-0' : 'site')?.focus();
      return;
    }
    if (budget === 'under') return go('notfit');
    const fresh = new Date();
    setNow(fresh);
    if (!day || !isBookable(day, fresh)) {
      const d = firstBookableDay(fresh);
      setDay(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    go('time');
  }

  function pickSlot(s: Date) {
    setSlot(s);
    if (errors.submit) setErrors((x) => ({ ...x, submit: undefined }));
    // On phones the slot list is long; bring Continue up so the next step is obvious.
    if (window.innerWidth < 768) {
      requestAnimationFrame(() => continueBtn.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (submitting) return;
    const next: Errors = {};
    if (!form.name.trim()) next.name = e.name;
    if (!looksLikeEmail(form.email)) next.email = form.email.trim() ? e.emailInvalid : e.emailMissing;
    if (noSite && !form.business.trim()) next.business = e.business;
    setErrors(next);
    const first = (['name', 'email', 'business'] as const).find((k) => next[k]);
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    if (!slot || !budget) return;
    // Re-check against the booking rules at the real current time (a tab can
    // sit open past midnight or past the minimum notice).
    if (!isSlotOpen(slot, new Date())) {
      setSlot(null);
      setNow(new Date());
      setStep('time');
      setErrors({ submit: e.slotGone });
      return;
    }
    const request = { start: slot, name: form.name.trim(), email: form.email.trim(), business: form.business.trim() };
    setSubmitting(true);
    try {
      await submitBooking(
        {
          budget,
          website: noSite ? null : normaliseUrl(site),
          durationMin: CALL_MINUTES,
          ...form,
          ...request,
          timeZone: localTimeZone(),
        },
        honeypot.current?.value,
      );
      setBooked(request);
      go('done');
    } catch {
      setErrors({ submit: e.submit });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSlot(null);
    setBooked(null);
    setNow(new Date());
    go('time');
  }

  /** Back/Change are ignored while a booking is being sent. */
  const backTo = (s: Step) => () => {
    if (!submitting) go(s);
  };

  const set = (k: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const slots = day ? getSlots(day, now) : [];

  // Back sits under the main button on phones, beside it from 640px.
  const actionRow = 'mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between';
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
          {step !== 'notfit' && step !== 'done' && <Stepper index={STEP_INDEX[step]} />}
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          {step === 'qualify' && (
            <form key="qualify" onSubmit={onQualify} noValidate className="step-in">
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="font-serif text-[1.85rem] leading-tight outline-none">
                {booking.qualifyHeading}
              </h3>

              <fieldset className="mt-6" aria-describedby={errors.budget ? 'budget-err' : undefined}>
                <legend className="text-[15px] font-semibold">{booking.budgetQuestion}</legend>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                  {booking.budgets.map((b, i) => {
                    const on = budget === b.id;
                    return (
                      <label
                        key={b.id}
                        className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember has-[:focus-visible]:ring-offset-2 sm:flex-col sm:items-start sm:gap-2.5 sm:py-4 ${
                          on ? 'border-ink bg-ink text-cream shadow-[0_12px_24px_-14px_rgb(17_17_17/0.8)]' : 'border-ink/20 bg-white hover:border-ink/45 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-cream'
                        }`}
                      >
                        <input
                          id={`budget-${i}`}
                          type="radio"
                          name="budget"
                          value={b.id}
                          checked={on}
                          required
                          aria-invalid={!!errors.budget}
                          onChange={() => {
                            setBudget(b.id);
                            setErrors((x) => ({ ...x, budget: undefined }));
                          }}
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
                {errors.budget && <ErrorText id="budget-err">{errors.budget}</ErrorText>}
              </fieldset>

              <div className="mt-6">
                <label htmlFor="site" className="text-[15px] font-semibold">
                  {booking.siteQuestion}
                </label>
                <div className="relative mt-3">
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
                    disabled={noSite}
                    aria-required={!noSite}
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
                <label className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink/80">
                  <input
                    id="no-site"
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

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="hidden text-[13px] text-stone sm:block">{booking.qualifyNote}</p>
                <button type="submit" className={`${mainBtn} sm:ml-auto`}>
                  {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </form>
          )}

          {step === 'notfit' && (
            <div key="notfit" className="step-in py-4 text-center sm:py-8">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-cream">
                <Hand size={24} className="text-ink/70" aria-hidden />
              </span>
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="mx-auto mt-5 max-w-md font-serif text-[2.1rem] leading-[1.05] outline-none">
                {booking.notFit.heading}
              </h3>
              <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-stone">{booking.notFit.body}</p>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-stone">{booking.notFit.later}</p>
              <button
                type="button"
                className="btn-ghost mt-8"
                onClick={() => {
                  setBudget(null);
                  go('qualify');
                }}
              >
                <ArrowLeft size={16} aria-hidden /> {booking.notFit.back}
              </button>
            </div>
          )}

          {step === 'time' && month && (
            <div key="time" className="step-in">
              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="font-serif text-[1.85rem] leading-tight outline-none">
                {booking.timeHeading}
              </h3>
              {errors.submit && <ErrorText id="time-err">{errors.submit}</ErrorText>}
              <div className="mt-6 grid gap-7 md:grid-cols-[1.1fr_1fr] md:gap-8">
                <Calendar
                  now={now}
                  month={month}
                  onMonth={setMonth}
                  selected={day}
                  onSelect={(d) => {
                    setDay(d);
                    setSlot(null);
                    if (errors.submit) setErrors((x) => ({ ...x, submit: undefined }));
                  }}
                />
                <div>
                  <p className="text-[15px] font-semibold">{day ? fmt.dayLong(day) : booking.chooseDay}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-stone">
                    <Globe size={13} aria-hidden /> {`${booking.timesIn} ${timeZoneLabel(slots[0] ?? day ?? now)}`}
                  </p>
                  <div role="group" aria-label={booking.a11y.times} className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-2">
                    {slots.map((s) => {
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
                          {fmt.time(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className={actionRow}>
                <button type="button" className={backBtn} onClick={() => go('qualify')}>
                  <ArrowLeft size={16} aria-hidden /> {booking.back}
                </button>
                <button ref={continueBtn} type="button" className={mainBtn} disabled={!slot} onClick={() => go('details')}>
                  {booking.continue} <ArrowRight className="arrow" size={18} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </div>
          )}

          {step === 'details' && slot && (
            <form key="details" onSubmit={onSubmit} noValidate className="step-in">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CalendarDays size={20} className="shrink-0 text-ember-deep" aria-hidden />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[15px] font-semibold">{fmt.dayLong(slot)}</p>
                    <p className="mt-0.5 truncate text-[13px] text-stone">{`${fmt.time(slot)} · ${CALL_MINUTES} min`}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={backTo('time')}
                  aria-label={booking.changeLabel}
                  className="shrink-0 py-2 text-[14px] font-semibold underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                >
                  {booking.change}
                </button>
              </div>

              <h3 id="booking-focus" ref={stepHeading} tabIndex={-1} className="mt-6 font-serif text-[1.85rem] leading-tight outline-none">
                {booking.detailsHeading}
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                <Field
                  id="f-business"
                  label={booking.fields.business}
                  value={form.business}
                  onValue={set('business')}
                  error={errors.business}
                  autoComplete="organization"
                  maxLength={160}
                  required={noSite}
                />
                <Field id="f-phone" label={booking.fields.phone} value={form.phone} onValue={set('phone')} hint={booking.fields.phoneHint} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} />
                <TextArea id="f-notes" label={booking.fields.notes} value={form.notes} onValue={set('notes')} hint={booking.fields.notesHint} className="sm:col-span-2" rows={3} maxLength={1500} />
                {/* Spam trap: hidden from people and screen readers; bots fill it in. */}
                <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor="f-hp">Leave this empty</label>
                  <input ref={honeypot} id="f-hp" name="hp_x7" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-stone">
                <Lock size={13} className="mt-[3px] shrink-0" aria-hidden /> {booking.privacy}
              </p>

              {errors.submit && <ErrorText id="submit-err">{errors.submit}</ErrorText>}

              <div className={actionRow}>
                <button type="button" className={backBtn} onClick={backTo('time')}>
                  <ArrowLeft size={16} aria-hidden /> {booking.back}
                </button>
                <button type="submit" className={mainBtn} aria-disabled={submitting} aria-busy={submitting}>
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
            </form>
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
                  <dd className="font-semibold">{fmt.dayLong(booked.start)}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="sr-only">{booking.a11y.time}</dt>
                  <Clock size={17} className="text-ember-deep" aria-hidden />
                  <dd>{`${fmt.time(booked.start)} · ${booking.card.title}`}</dd>
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

function TextArea({ id, label, value, onValue, error, hint, className, ...rest }: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(ev) => onValue(ev.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className="field"
        {...rest}
      />
    </FieldShell>
  );
}
