import { brand, cta, finalCta, footer, hero } from '../content';
import { CtaLink, SplitHeading, swingProps, vars } from '../components/ui';

export function FinalCta() {
  return (
    <section aria-labelledby="final-h" className="slab cv-auto relative isolate overflow-hidden bg-ink text-cream" style={vars({ '--cis-m': '1170px', '--cis-d': '740px' })}>
      <div aria-hidden className="glow-dark pointer-events-none absolute inset-0 -z-10" />
      <div className="container-x grid items-center gap-14 py-20 md:py-28 lg:grid-cols-12 lg:gap-10">
        <div className="flex justify-center lg:col-span-5">
          <DoorHanger />
        </div>

        <div className="lg:col-span-7">
          <SplitHeading id="final-h" plain={finalCta.heading.plain} em={finalCta.heading.em} className="reveal text-[clamp(3.2rem,2rem+5vw,6.4rem)] leading-[0.92] tracking-[-0.02em]" />
          <p className="reveal mt-6 text-[19px] text-cream/80 sm:text-[22px]" style={vars({ '--d': '80ms' })}>
            {finalCta.sub}
          </p>
          <div className="reveal my-8 h-px max-w-lg bg-white/12" style={vars({ '--d': '120ms' })} />
          <ul className="reveal grid max-w-lg gap-3.5 sm:grid-cols-2 sm:gap-x-8" style={vars({ '--d': '160ms' })}>
            {hero.promises.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[16px] font-semibold sm:text-[17px]">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[2px] bg-ember" />
                {p}
              </li>
            ))}
          </ul>
          <div data-cta-zone className="reveal mt-10 flex flex-col items-start gap-3.5" style={vars({ '--d': '200ms' })}>
            <CtaLink className="w-full sm:w-auto">{cta.label}</CtaLink>
            <p className="pl-1 text-[14px] text-fog">{finalCta.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The "Do not click this ad." door hanger from the ad, swaying gently. */
function DoorHanger() {
  const h = finalCta.hanger;
  return (
    <div className="reveal" style={vars({ '--d': '100ms' })}>
      <div className="loop swing" style={vars({ '--r0': '-6deg', '--r1': '-3deg', '--origin': '50% 70px', '--dur': '6.5s' })} {...swingProps}>
        <div
          className="paper-card relative w-[min(78vw,340px)] rounded-[30px] px-8 pb-9 pt-8 text-center"
          role="img"
          aria-label={`${h.top}: ${h.line1} ${h.line2} ${h.line3} ${h.bottom}`}
        >
          <span className="paper-card-inner rounded-[22px]" aria-hidden />
          <span aria-hidden className="mx-auto block size-[84px] rounded-full bg-ink shadow-[inset_0_6px_12px_rgb(0_0_0/0.6)] sm:size-[92px]" />
          <p aria-hidden className="mt-8 text-[13px] font-medium uppercase tracking-[0.34em] text-ink/70">
            {h.top}
          </p>
          <p aria-hidden className="mt-3 font-serif text-[clamp(3.4rem,13vw,4.5rem)] leading-[0.9] tracking-[-0.02em]">
            {h.line1}
            <br />
            {h.line2}
            <br />
            <em>{h.line3}</em>
          </p>
          <div aria-hidden className="mt-7 h-[2px] w-full -rotate-[1.5deg] bg-ember" />
          <p aria-hidden className="mt-5 text-[17px] font-bold leading-snug">
            {h.bottom}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="container-x flex flex-col gap-3 pb-28 pt-10 text-[13.5px] text-stone sm:flex-row sm:items-center sm:justify-between md:pb-10">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="wordmark text-[15px] text-ink">{brand.name}</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em]">{brand.tagline}</span>
      </p>
      <p>
        {`© ${brand.year} ${brand.name}. ${footer.line}`}
      </p>
    </footer>
  );
}
