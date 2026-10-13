import { useEffect, useRef } from 'react';
import { CalendarCheck2, Check } from 'lucide-react';
import { cta, hero } from '../content';
import { initPointerDepth } from '../lib/motion';
import { AgentCursor, BrowserFrame, CtaLink, PhoneFrame, PriceTag, vars } from '../components/ui';
import { DesktopMock, PhoneMock } from './HeroMock';

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-h" className="relative isolate overflow-clip pt-[88px] sm:pt-28 lg:pt-32">
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x grid items-center gap-y-9 sm:gap-y-12 lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10">
        {/* The headline is sized to its column (cqi) so it always breaks like
            the ad: "Not for someone / who wants a $500 / website." */}
        <div className="@container relative z-10 lg:col-span-6">
          <h1 id="hero-h" className="font-serif text-[clamp(2.75rem,14.4cqi,6.6rem)] leading-[0.95] tracking-[-0.022em]">
            {`${hero.headline.before} `}
            <PriceTag price={hero.headline.price} />
            {' '}
            <em>{hero.headline.after}</em>
          </h1>

          <p className="mt-5 max-w-[31rem] text-[1.0625rem] leading-[1.6] text-stone sm:mt-6 sm:text-lg">{hero.subhead}</p>

          <div data-cta-zone className="loop cta-nudge mt-6 flex flex-col items-start gap-3.5 sm:mt-8">
            <CtaLink className="w-full sm:w-auto">{cta.label}</CtaLink>
            <p className="pl-1 text-[14px] text-stone">
              {`${hero.ctaNote.before} `}
              <strong className="font-semibold text-ink">{hero.ctaNote.strong}</strong>
              {` ${hero.ctaNote.after}`}
            </p>
          </div>
        </div>

        <div className="lg:col-span-6">
          <HeroStage />
        </div>
      </div>

      <div className="container-x mt-14 pb-6 lg:mt-20">
        <ul className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:gap-x-8">
          {hero.promises.map((p, i) => (
            <li key={p} className="reveal border-t border-ink pt-3.5 text-[15px] font-semibold leading-snug sm:text-[17px]" style={vars({ '--d': `${i * 70}ms` })}>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * An example homepage (drawn in code, see HeroMock.tsx) on a laptop and a
 * phone, with two frosted chips, layered at different depths. Each layer has
 * two wrappers: the outer one takes scroll
 * parallax (data-speed), the inner one pointer depth (data-depth), so the two
 * motions never fight over the same property.
 */
function HeroStage() {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => (stage.current ? initPointerDepth(stage.current) : undefined), []);

  return (
    <div ref={stage} className="hero-stage loop relative mx-auto w-full max-w-[640px] lg:max-w-none">
      <div className="relative aspect-[10/9] sm:aspect-[16/12] lg:aspect-[16/13]">
        {/* Desktop homepage */}
        <div data-speed="0.03" className="absolute right-0 top-0 w-[90%] sm:w-[86%] lg:w-[95%]">
          <div data-depth="0.7" className="enter-rise" style={vars({ '--d': '100ms' })}>
            <div className="hero-tilt">
              <BrowserFrame url={hero.mock.url}>
                {/* An example homepage, and a designer and you at work on it (see .hc in index.css). */}
                <div className="hc loop relative">
                  <DesktopMock />
                  <span aria-hidden className="hc-select">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span aria-hidden className="hc-comment">
                    <span className="hc-avatar">{hero.collab.youInitial}</span>
                    {hero.collab.comment}
                    <Check strokeWidth={3} />
                  </span>
                  <AgentCursor name={hero.collab.designer} tone="ink" className="hc-cur-designer" />
                  <AgentCursor name={hero.collab.you} className="hc-cur-you" click />
                </div>
              </BrowserFrame>
            </div>
          </div>
        </div>

        {/* Mobile homepage */}
        <div data-speed="0.05" className="absolute bottom-0 left-0 w-[31%] sm:left-[3%] sm:w-[25%] lg:left-[-2%] lg:w-[27%]">
          <div data-depth="2" className="enter-rise" style={vars({ '--d': '260ms' })}>
            <PhoneFrame className="float-phone">
              <PhoneMock />
            </PhoneFrame>
          </div>
        </div>

        {/* Frosted chip: the free mockup */}
        <div aria-hidden data-speed="0.12" className="absolute bottom-[9%] right-[1%] sm:bottom-auto sm:right-[-1%] sm:top-[52%] lg:right-[-3%] lg:top-[47%]">
          <div data-depth="3.4" className="enter-pop" style={vars({ '--d': '750ms' })}>
            <div className="glass float-a flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 sm:py-3 sm:pl-3 sm:pr-5">
              <span className="grid size-9 place-items-center rounded-xl bg-ink text-cream sm:size-10">
                <Check size={18} strokeWidth={2.6} />
              </span>
              <span className="leading-tight">
                <span className="block text-[13px] font-semibold sm:text-[14px]">{hero.chips.mockup.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink/75 sm:text-[12.5px]">
                  {hero.chips.mockup.status}
                  <span className="rounded-full bg-ember px-1.5 py-px text-[10.5px] font-bold text-ink">{hero.chips.mockup.badge}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Frosted chip: the call (hidden on the smallest screens to keep it calm) */}
        <div aria-hidden data-speed="0.06" className="absolute bottom-[4%] right-[22%] hidden sm:block lg:bottom-[9%] lg:right-[12%]">
          <div data-depth="2.6" className="enter-pop" style={vars({ '--d': '950ms' })}>
            <div className="glass float-b flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-5">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-ember-deep ring-1 ring-ink/5">
                <CalendarCheck2 size={19} strokeWidth={2.2} />
              </span>
              <span className="leading-tight">
                <span className="block text-[14px] font-semibold">{hero.chips.call.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink/75">{hero.chips.call.detail}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[12.5px] text-ink/70 sm:mt-10 lg:mt-12 lg:pl-[30%] lg:text-left">
        <span className="font-semibold text-ink">{hero.mock.caption.strong}</span>
        {` · ${hero.mock.caption.rest}`}
      </p>
    </div>
  );
}
