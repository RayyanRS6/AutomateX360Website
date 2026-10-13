import { Check, Plus } from 'lucide-react';
import { value } from '../content';
import { Eyebrow, SplitHeading, vars } from '../components/ui';

export function WhatYouGet() {
  const [custom, hosting, plugins, scale, own] = value.items;

  return (
    <section
      aria-labelledby="value-h"
      className="slab cv-auto relative isolate overflow-hidden bg-ink py-20 text-cream md:py-28"
      style={vars({ '--cis-m': '1675px', '--cis-d': '935px' })}
    >
      <div aria-hidden className="glow-dark pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-6">
            <Eyebrow dark className="reveal">
              {value.eyebrow}
            </Eyebrow>
            <SplitHeading id="value-h" plain={value.heading.plain} em={value.heading.em} className="reveal mt-5 text-h2" />
            <p className="reveal mt-6 max-w-md text-[17px] leading-relaxed text-fog sm:text-lg" style={vars({ '--d': '80ms' })}>
              {value.intro}
            </p>
          </div>
          <div className="lg:col-span-6">
            <PriceTags />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-3 sm:gap-4 md:mt-20 md:grid-cols-6 md:gap-5">
          {/* Custom-made */}
          <article className="glass-dark reveal relative col-span-2 flex min-h-[290px] flex-col justify-between gap-8 overflow-hidden rounded-[26px] p-6 sm:p-8 md:col-span-4">
            <TemplateArt />
            <div className="max-w-md">
              <h3 className="font-serif text-h3">{custom.title}</h3>
              <p className="mt-2.5 text-[15.5px] leading-relaxed text-fog">{custom.body}</p>
            </div>
          </article>

          {/* $0 hosting */}
          <StatCard item={hosting} delay={80} />
          {/* 0 plugins */}
          <StatCard item={plugins} delay={0} className="md:hidden" />

          {/* Built to scale */}
          <article className="glass-dark reveal col-span-2 flex flex-col justify-between gap-8 overflow-hidden rounded-[26px] p-6 sm:p-7" style={vars({ '--d': '60ms' })}>
            <ScaleArt />
            <div>
              <h3 className="font-serif text-h3">{scale.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-fog">{scale.body}</p>
            </div>
          </article>

          <StatCard item={plugins} delay={120} className="hidden md:flex" />

          {/* Ownership */}
          <article className="glass-dark reveal col-span-2 flex flex-col justify-between gap-8 overflow-hidden rounded-[26px] p-6 sm:p-7" style={vars({ '--d': '180ms' })}>
            <ul className="flex flex-wrap gap-2" aria-label={value.ownershipLabel}>
              {value.ownership.map((x) => (
                <li key={x} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] py-1.5 pl-2 pr-3 text-[13px] font-medium ring-1 ring-white/10">
                  <span className="grid size-5 place-items-center rounded-full bg-ember text-ink">
                    <Check size={12} strokeWidth={3} aria-hidden />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="font-serif text-h3">{own.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-fog">{own.body}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

type Item = (typeof value.items)[number];

function StatCard({ item, delay, className = '' }: { item: Item; delay: number; className?: string }) {
  return (
    <article
      className={`glass-dark reveal col-span-1 flex flex-col justify-between gap-6 rounded-[26px] p-5 sm:p-7 md:col-span-2 ${className}`}
      style={vars({ '--d': `${delay}ms` })}
    >
      <p className="flex items-baseline gap-2">
        <span className="font-serif text-[clamp(3.6rem,2.6rem+3vw,5.4rem)] leading-[0.8] text-ember">{'stat' in item ? item.stat : ''}</span>
        <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-fog">{'statNote' in item ? item.statNote : ''}</span>
      </p>
      <div>
        <h3 className="text-[16px] font-semibold leading-snug sm:font-serif sm:text-h3 sm:font-normal">{item.title}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fog sm:text-[15px]">{item.body}</p>
      </div>
    </article>
  );
}

/** Two hanging price tags, straight from the ad. */
function PriceTags() {
  return (
    <div className="reveal mx-auto max-w-[520px]" style={vars({ '--d': '120ms' })}>
      <p className="text-center font-serif text-[1.65rem] leading-tight text-cream/85 sm:text-[1.9rem]">
        {`${value.tags.caption.plain} `}
        <em>{value.tags.caption.em}</em>
      </p>
      <div className="mt-9 grid grid-cols-2 items-start gap-3 sm:gap-6">
        <div className="loop swing" style={vars({ '--r0': '-6deg', '--r1': '-3.5deg', '--origin': '50% 10%', '--dur': '6.5s' })}>
          <div className="relative rounded-[18px] bg-[#cfcac2] px-3 pb-7 pt-12 text-center text-ink shadow-[0_30px_50px_-24px_rgb(0_0_0/0.8)] sm:px-5 sm:pt-14">
            <span className="absolute left-1/2 top-4 size-[18px] -translate-x-1/2 rounded-full bg-ink sm:size-5" />
            <p className="relative inline-block font-serif text-[clamp(2.7rem,9vw,4rem)] leading-none text-ink/75">
              <s className="no-underline">{value.tags.cheap.price}</s>
              <span aria-hidden className="absolute left-[-8%] right-[-8%] top-[52%] h-[3px] -rotate-[9deg] rounded bg-ink" />
            </p>
            <p className="mt-3 text-[12.5px] font-semibold leading-snug text-ink/70 sm:text-[14px]">
              {value.tags.cheap.lines.map((l) => (
                <span key={l} className="block text-balance">
                  {l}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="loop swing mt-5" style={vars({ '--r0': '4deg', '--r1': '1.5deg', '--origin': '50% 10%', '--dur': '7.5s' })}>
          <div className="relative rounded-[18px] bg-ember px-3 pb-7 pt-12 text-center text-ink shadow-[0_30px_60px_-24px_rgb(240_68_30/0.55)] sm:px-5 sm:pt-14">
            <span className="absolute left-1/2 top-4 size-[18px] -translate-x-1/2 rounded-full bg-ink sm:size-5" />
            <p className="font-serif text-[clamp(2.7rem,9vw,4rem)] leading-none">{value.tags.ours.price}</p>
            <p className="mt-3 text-[12.5px] font-semibold leading-snug sm:text-[14px]">
              {value.tags.ours.lines.map((l) => (
                <span key={l} className="block text-balance">
                  {l}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Three identical template tiles and the one that is yours. */
function TemplateArt() {
  return (
    <div className="flex items-end gap-2.5 sm:gap-3.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-[22%] max-w-[120px] rounded-lg bg-white/[0.05] p-2 ring-1 ring-white/[0.07]">
          <div className="h-1.5 w-2/3 rounded bg-white/15" />
          <div className="mt-2 h-8 rounded bg-white/10 sm:h-10" />
          <div className="mt-2 h-1.5 w-full rounded bg-white/10" />
          <div className="mt-1 h-1.5 w-3/4 rounded bg-white/10" />
          <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/55">{value.art.template}</p>
        </div>
      ))}
      <div className="w-[26%] max-w-[140px] -translate-y-3 rotate-[-3deg] rounded-lg bg-cream p-2 text-ink shadow-[0_24px_40px_-16px_rgb(240_68_30/0.55)]">
        <div className="h-1.5 w-1/2 rounded bg-ink/30" />
        <p className="mt-2 font-serif text-[15px] leading-none sm:text-[19px]">
          {`${value.art.yours.plain} `}
          <em>{value.art.yours.em}</em>
        </p>
        <div className="mt-2 h-8 rounded bg-[linear-gradient(135deg,#f0441e,#f5b71f)] sm:h-10" />
        <div className="mt-2 h-2 w-1/2 rounded-full bg-ink" />
      </div>
    </div>
  );
}

/** Pages stacking up, with room for more. */
function ScaleArt() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden>
      {value.scalePages.map((p) => (
        <span key={p} className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium ring-1 ring-white/10">
          {p}
        </span>
      ))}
      <span className="flex items-center gap-1 rounded-lg border border-dashed border-ember/60 px-3 py-1.5 text-[13px] font-medium text-ember">
        <Plus size={13} strokeWidth={2.6} /> {value.art.addPage}
      </span>
    </div>
  );
}
