import { Check, X } from 'lucide-react';
import { filter } from '../content';
import { Eyebrow, SplitHeading, swingProps, vars } from '../components/ui';

export function Filter() {
  return (
    <section aria-labelledby="filter-h" className="cv-auto relative pb-14 pt-24 md:pb-16 md:pt-32 lg:pb-28" style={vars({ '--cis-m': '980px', '--cis-d': '500px' })}>
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-6">
          <Eyebrow className="reveal">{filter.eyebrow}</Eyebrow>
          <SplitHeading id="filter-h" plain={filter.heading.plain} em={filter.heading.em} className="reveal mt-5 text-h2" />
          <div className="reveal mt-10 md:mt-14" style={vars({ '--d': '120ms' })}>
            <ClosedSign />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <div className="reveal rounded-[28px] bg-paper p-6 shadow-[0_30px_60px_-40px_rgb(17_17_17/0.45)] ring-1 ring-ink/5 sm:p-8">
            <h3 className="flex items-center gap-3 text-[17px] font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-ember">
                <Check size={16} strokeWidth={3} aria-hidden />
              </span>
              {filter.yes.title}
            </h3>
            <ul className="yes-list loop mt-6 space-y-4">
              {filter.yes.items.map((t, i) => (
                <li key={t} className="flex gap-3.5 text-pretty text-[17px] leading-snug sm:text-[18px]">
                  <Check size={20} strokeWidth={2.6} className="yes-check mt-0.5 shrink-0 text-ember-deep" style={vars({ '--i': i })} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal rounded-[28px] border border-dashed border-ink/20 p-6 sm:p-8" style={vars({ '--d': '100ms' })}>
            <h3 className="flex items-center gap-3 text-[17px] font-semibold text-ink/70">
              <span className="grid size-8 place-items-center rounded-full bg-ink/[0.07]">
                <X size={16} strokeWidth={3} aria-hidden />
              </span>
              {filter.no.title}
            </h3>
            <ul className="no-list loop mt-6 space-y-4">
              {filter.no.items.map((t, i) => (
                <li key={t} className="flex gap-3.5 text-pretty text-[17px] leading-snug text-stone sm:text-[18px]">
                  <X size={20} strokeWidth={2.4} className="no-x mt-0.5 shrink-0 text-ink/35" style={vars({ '--i': i })} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The shop sign from the "Closed" ad, hung from a nail and swaying slightly. */
function ClosedSign() {
  return (
    <div
      className="loop swing relative mx-auto w-full max-w-[470px] pt-[58px] lg:mx-0"
      style={vars({ '--r0': '-4deg', '--r1': '-1.5deg', '--origin': '50% 8px', '--dur': '7.5s' })}
      {...swingProps}
      role="img"
      aria-label={`${filter.sign.top} ${filter.sign.word} ${filter.sign.bottom}`}
    >
      <svg className="absolute inset-x-0 top-0 z-10 h-[82px] w-full overflow-visible" viewBox="0 0 470 82" preserveAspectRatio="none" aria-hidden>
        <path d="M66 82 L235 8 L404 82" fill="none" stroke="#8f897f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute left-1/2 top-0 z-20 size-4 -translate-x-1/2 rounded-full bg-ink ring-4 ring-cream" aria-hidden />
      <div className="paper-card relative rounded-[22px] px-6 pb-8 pt-9 text-center sm:px-10 sm:pb-10">
        <span className="paper-card-inner rounded-[14px]" aria-hidden />
        <span className="absolute left-[14%] top-[17px] size-[14px] -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <span className="absolute left-[86%] top-[17px] size-[14px] -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-ink/70 sm:text-[12.5px]">{filter.sign.top}</p>
        <p className="mt-1 font-serif text-[clamp(4.2rem,15vw,6.8rem)] italic leading-[0.92] tracking-[-0.02em]">{filter.sign.word}</p>
        <div className="mx-auto mt-4 h-[2px] w-[86%] -rotate-[1.5deg] bg-ember" />
        <p className="mt-4 text-[16px] font-bold sm:text-[19px]">{filter.sign.bottom}</p>
      </div>
    </div>
  );
}
