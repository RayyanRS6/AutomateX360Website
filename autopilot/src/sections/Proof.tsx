import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { proof, work, type Work } from '../content';
import { vars, workManifest, workSrc, workSrcSet } from '../components/ui';

export function Proof() {
  // Two builds get big side-by-side cards; three or four get a tighter grid.
  const wide = work.length <= 2;

  return (
    <section aria-labelledby="proof-h" className="cv-auto relative pb-20 pt-16 sm:pt-24 md:pb-28" style={vars({ '--cis-m': '690px', '--cis-d': '680px' })}>
      <div className="container-x flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <p className="eyebrow reveal">{proof.eyebrow}</p>
          <h2 id="proof-h" className="reveal mt-5 font-serif text-[clamp(2.3rem,1.6rem+2.6vw,3.6rem)] leading-[0.98] tracking-[-0.015em]" style={vars({ '--d': '60ms' })}>
            {`${proof.heading.plain} `}
            <em>{proof.heading.em}</em>
          </h2>
          <p className="reveal mt-4 text-[16px] leading-relaxed text-stone sm:text-[17px]" style={vars({ '--d': '90ms' })}>
            {proof.intro}
          </p>
        </div>
        <p className="reveal text-[14px] text-stone" style={vars({ '--d': '120ms' })}>
          {/* The hover hint only where hover works; touch tablets see the grid as is. */}
          <span className="hidden [@media(hover:hover)_and_(min-width:768px)]:inline">{proof.hintDesktop}</span>
          <span className="md:hidden">{proof.hintMobile}</span>
        </p>
      </div>

      <div className="mt-9 md:container-x md:mt-12">
        <ul className={`snap-row ${wide ? '' : 'xl:grid-cols-4'}`} aria-labelledby="proof-h">
          {work.map((w, i) => (
            <li key={w.slug} className="reveal" style={vars({ '--d': `${i * 90}ms` })}>
              <ProofCard w={w} wide={wide} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * On desktop the card shows the first screen of the site, and swaps in the
 * tall full-page capture on first hover, which then scrolls inside the frame.
 * Phones get a light crop of the mobile site. The whole card opens the live
 * site in a new tab, so visitors can look around and come back.
 */
function ProofCard({ w, wide }: { w: Work; wide: boolean }) {
  const ratio = workManifest[w.slug]?.fullRatio;
  const [wantFull, setWantFull] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  // Longer pages scroll for longer, so the speed feels the same on each card.
  const dur = ratio ? Math.max(5, ratio * 2.2) : 6;
  const desktopSet = wantFull && ratio ? workSrcSet(w.slug, 'full', [600, 900, 1200]) : workSrcSet(w.slug, 'fold', [600, 800, 1200]);

  return (
    <a
      href={w.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${proof.visit}: ${w.name} (${proof.newTab})`}
      className="block rounded-[24px] focus-visible:outline-offset-4"
    >
    <figure className="proof-card group" onPointerEnter={(e) => e.pointerType === 'mouse' && setWantFull(true)}>
      <div className="rounded-[22px] bg-white p-1.5 shadow-[0_40px_70px_-40px_rgb(17_17_17/0.5),0_8px_20px_-12px_rgb(17_17_17/0.15)] ring-1 ring-ink/5 transition-transform duration-500 ease-[var(--ease-soft)] md:group-hover:-translate-y-1.5">
        <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-1.5" aria-hidden>
          <i className="size-2 rounded-full bg-ink/12" />
          <i className="size-2 rounded-full bg-ink/12" />
          <i className="size-2 rounded-full bg-ink/12" />
          <span className="ml-2 truncate text-[11px] font-medium text-ink/65">{w.domain ?? w.name}</span>
        </div>
        <div className={`proof-screen rounded-[15px] ${wide ? 'proof-wide' : ''}`} style={vars({ '--scroll-dur': `${dur}s` })}>
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSet} sizes={wide ? '(min-width: 1280px) 600px, 46vw' : '(min-width: 1100px) 290px, 45vw'} />
            <img
              src={workSrc(w.slug, 'mtop', 600)}
              srcSet={workSrcSet(w.slug, 'mtop', [400, 600])}
              sizes="74vw"
              width={600}
              height={800}
              alt={`${w.name} homepage`}
              loading="lazy"
              decoding="async"
              onLoad={(e) => {
                if (e.currentTarget.currentSrc.includes('-full-')) setFullReady(true);
              }}
              onError={() => {
                // If the tall capture fails to load, fall back to the first screen.
                setWantFull(false);
                setFullReady(false);
              }}
              className={fullReady ? undefined : 'no-ratio'}
            />
          </picture>
        </div>
      </div>
      <figcaption className="mt-4 px-1">
        <span className="block text-[16px] font-semibold leading-tight sm:text-[17px]">{w.name}</span>
        <span className="mt-1 block text-pretty text-[13.5px] text-stone sm:text-[14px]">{w.industry}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition group-hover:decoration-ink">
          {proof.visit}
          <ArrowUpRight size={14} className="text-ember-deep" aria-hidden />
        </span>
        {w.result && (
          <span className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-medium text-ink">
            <ArrowUpRight size={14} className="text-ember-deep" aria-hidden />
            {w.result}
          </span>
        )}
      </figcaption>
    </figure>
    </a>
  );
}
