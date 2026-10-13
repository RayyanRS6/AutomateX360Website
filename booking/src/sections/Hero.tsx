import { CalendarCheck2, Check, Mail, Moon, SendHorizontal } from 'lucide-react';
import { brand, cta, features, hero } from '../content';
import { AgentCursor, CtaLink, Hanging, HeadingIcon, vars } from '../components/ui';
import './hero.css';

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-h" className="relative isolate overflow-clip pt-[88px] sm:pt-28 lg:pt-32">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x grid items-center gap-y-12 lg:grid-cols-12 lg:gap-x-10">
        <div className="@container relative z-10 lg:col-span-6">
          <p className="enter-pop inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/60 py-1.5 pl-3 pr-3.5 text-[12.5px] font-semibold text-ink/80">
            <span className="live-dot" aria-hidden />
            {hero.status}
          </p>

          <h1 id="hero-h" className="mt-5 font-serif text-[clamp(3rem,15.5cqi,6.7rem)] leading-[0.94] tracking-[-0.022em] sm:mt-6">
            {`${hero.headline.before} `}
            <HeadingIcon>
              <CalendarCheck2 strokeWidth={2.4} />
            </HeadingIcon>
            {' '}
            <em className="whitespace-nowrap">{hero.headline.em}</em>
          </h1>

          <p className="mt-5 max-w-[31rem] text-[1.0625rem] leading-[1.6] text-stone sm:mt-6 sm:text-lg">{hero.subhead}</p>

          <div data-cta-zone className="mt-7 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-center sm:gap-7">
            <CtaLink className="w-full sm:w-auto">{cta.label}</CtaLink>
            <PriceLine />
          </div>
        </div>

        <div className="lg:col-span-6">
          <HeroScene />
        </div>
      </div>

      <div className="container-x mt-14 pb-6 lg:mt-20">
        <ul className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:gap-x-8" aria-label={brand.tagline}>
          {features.map((f, i) => (
            <li key={f} className="reveal border-t border-ink pt-3.5 text-[15px] font-semibold leading-snug sm:text-[17px]" style={vars({ '--d': `${i * 70}ms` })}>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "$449 a month, all of it / 3-MONTH MINIMUM", set like the ads. */
export function PriceLine({ dark = false }: { dark?: boolean }) {
  return (
    <p className="flex items-end gap-3">
      <span className="font-serif text-[3.4rem] leading-[0.8] tracking-[-0.02em]">{hero.price.amount}</span>
      <span className="pb-0.5 leading-tight">
        <span className="block text-[16px] font-semibold">{hero.price.unit}</span>
        <span className={`mono-label mt-1 block text-[10.5px] ${dark ? 'text-fog' : 'text-stone'}`}>{hero.price.note}</span>
      </span>
    </p>
  );
}

/**
 * The night shift, playing on a loop while it's on screen: a visitor asks a
 * question at 11:42 PM, the Reply agent answers, the Booking agent drags the
 * booking into the calendar and the Follow-up agent sends the confirmation.
 *
 * Everything is placed on a fixed 100 × 106 grid in container units (cqw), so
 * the agents' paths in hero.css hit the same spots at every screen size. The
 * markup's resting state is the finished scene, which is what lite devices,
 * reduced motion and the prerendered page show.
 */
function HeroScene() {
  const d = hero.demo;
  return (
    <div className="hero-scene loop mx-auto w-full max-w-[540px]">
      <div className="hs-stage">
        <p className="sr-only">{d.description}</p>
        <div aria-hidden className="contents">
          <p className="hs-clock">
            <Moon className="hs-ico" strokeWidth={2.4} />
            {d.clock}
          </p>

          <div className="hs-browser">
            <div className="hs-bar">
              <i />
              <i />
              <i />
              <span className="hs-url">{d.url}</span>
              <span className="hs-example">{d.label}</span>
            </div>
            <div className="hs-chat-head">
              <span className="hs-avatar">A</span>
              <span className="leading-tight">
                <span className="block font-semibold">{d.chatTitle}</span>
                <span className="hs-online">
                  <span className="live-dot" />
                  {d.chatStatus}
                </span>
              </span>
            </div>
          </div>

          <p className="hs-ask bubble bubble-cream">{d.ask}</p>
          <p className="hs-typing bubble bubble-us">
            <span className="typing">
              <i style={vars({ '--i': 0 })} />
              <i style={vars({ '--i': 1 })} />
              <i style={vars({ '--i': 2 })} />
            </span>
          </p>
          <div className="hs-answer bubble bubble-us">
            {d.answer}
            <span className="hs-chip hs-chip-1">
              {d.slots[0]}
              <span className="hs-chip-on">{d.slots[0]}</span>
            </span>
            <span className="hs-chip hs-chip-2">{d.slots[1]}</span>
          </div>
          <p className="hs-booked bubble bubble-ember">
            <Check className="hs-ico" strokeWidth={3} />
            {d.booked}
          </p>
          <p className="hs-input">
            {d.input}
            <span className="hs-send">
              <SendHorizontal strokeWidth={2.4} />
            </span>
          </p>

          <div className="hs-cal">
            <p className="hs-cal-title">{d.calendarTitle}</p>
            <div className="hs-cal-grid">
              {d.days.map((day) => (
                <span key={day} className="hs-cal-day">
                  {day}
                </span>
              ))}
              <span className="hs-slot hs-slot-on">{d.bookedChip}</span>
              <span className="hs-slot hs-slot-empty">
                <span className="hs-slot hs-slot-on hs-target">{d.bookedChip}</span>
              </span>
              <span className="hs-slot hs-slot-on">{d.bookedChip}</span>
              <span className="hs-slot hs-slot-empty" />
              <span className="hs-slot hs-slot-empty" />
              <span className="hs-slot hs-slot-on">{d.bookedChip}</span>
            </div>
          </div>

          <div className="hs-toast">
            <span className="hs-toast-ico">
              <Mail strokeWidth={2.4} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block font-semibold">{d.email.title}</span>
              <span className="hs-toast-body">{d.email.body}</span>
            </span>
            <span className="hs-toast-check">
              <Check strokeWidth={3.2} />
            </span>
          </div>

          <p className="hs-note sticky-note">
            {d.note.line1}
            <br />
            {d.note.line2}
          </p>

          <span className="hs-carry">{d.bookedChip}</span>
          <AgentCursor agent="reply" className="hs-cur hs-cur-reply" />
          <AgentCursor agent="booking" className="hs-cur hs-cur-booking" click flip />
          <AgentCursor agent="followup" className="hs-cur hs-cur-followup" click flip />
        </div>

        <Hanging label={`${hero.tag.top}: ${hero.tag.amount} ${hero.tag.unit}`} holes={[50]} drop={26} className="hs-tag" style={vars({ '--r0': '-4deg', '--r1': '3deg', '--dur': '5.5s' })}>
          <span className="hs-tag-card">
            <span className="hs-tag-hole" />
            <span className="mono-label hs-tag-top">{hero.tag.top}</span>
            <span className="hs-tag-amount">{hero.tag.amount}</span>
            <span className="hs-tag-unit">{hero.tag.unit}</span>
          </span>
        </Hanging>
      </div>
    </div>
  );
}
