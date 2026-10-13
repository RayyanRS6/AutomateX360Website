import { ArrowUp, Check, X } from 'lucide-react';
import { filter } from '../content';
import { AgentCursor, Eyebrow, SplitHeading, vars } from '../components/ui';
import './filter.css';

/** Bar heights as a share of the chart: five rising ink bars, then yours (ember). */
const BARS = [20, 32, 44, 56, 68];
const YOURS = 97;

/**
 * Who it's for, echoing the ad: "Not for owners happy where they are. Only
 * for business owners who want to scale." with its rising bar chart.
 * Desktop: heading and both lists on the left, the chart on the right.
 * Phone: heading, chart, then the lists stacked.
 */
export function Filter() {
  return (
    <section
      id="fit"
      aria-labelledby="fit-h"
      className="cv-auto relative overflow-clip pb-20 pt-20 md:pb-28 md:pt-28"
      style={vars({ '--cis-m': '1150px', '--cis-d': '560px' })}
    >
      <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-y-12 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10">
        <div className="min-w-0 lg:col-span-7 lg:row-start-1">
          <Eyebrow className="reveal">{filter.eyebrow}</Eyebrow>
          <SplitHeading id="fit-h" plain={filter.heading.plain} em={filter.heading.em} emBlock className="reveal mt-5 text-h2" />
          <p
            className="reveal mt-6 max-w-[30rem] border-l-[3px] border-ember pl-4 text-[19px] font-semibold leading-snug sm:text-[21px]"
            style={vars({ '--d': '80ms' })}
          >
            {filter.sub}
          </p>
        </div>

        <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:self-center">
          <RisingChart />
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-7 lg:col-start-1 lg:row-start-2">
          <div className="reveal rounded-[26px] bg-paper p-6 shadow-[0_30px_60px_-40px_rgb(17_17_17/0.45)] ring-1 ring-ink/5 sm:p-7">
            <h3 className="flex items-center gap-3 text-[17px] font-semibold">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ember text-ink">
                <Check size={16} strokeWidth={3} />
              </span>
              {filter.yes.title}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {filter.yes.items.map((t) => (
                <li key={t} className="flex gap-3 text-[16px] leading-[22px] sm:text-[16.5px] sm:leading-[23px]">
                  <span aria-hidden className="grid size-[22px] shrink-0 place-items-center rounded-full bg-ink text-cream">
                    <Check size={13} strokeWidth={3.2} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal rounded-[26px] border-[1.5px] border-dashed border-ink/20 p-6 sm:p-7" style={vars({ '--d': '100ms' })}>
            <h3 className="flex items-center gap-3 text-[17px] font-semibold text-ink/75">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.07] text-ink/70">
                <X size={16} strokeWidth={3} />
              </span>
              {filter.no.title}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {filter.no.items.map((t) => (
                <li key={t} className="flex gap-3 text-[16px] leading-[22px] text-stone sm:text-[16.5px] sm:leading-[23px]">
                  <span aria-hidden className="grid size-[22px] shrink-0 place-items-center rounded-full border border-stone/40 text-stone">
                    <X size={12} strokeWidth={3} />
                  </span>
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

/**
 * The ad's rising bar chart on a taped-up card. Placed on a fixed grid in
 * container units (see filter.css) so the Follow-up agent lands on the
 * "You, with it" label at any width. The bars grow once each time the chart
 * comes on screen; the resting markup is the finished chart.
 */
function RisingChart() {
  const c = filter.chart;
  return (
    <div className="reveal mx-auto w-full max-w-[460px] lg:mr-0" style={vars({ '--d': '120ms' })}>
      <div className="fit-card">
        <span aria-hidden className="fit-tape" />
        <div className="fit-chart loop" role="img" aria-label={filter.chart.alt}>
          <div className="fit-stage" aria-hidden>
            <p className="fit-axis">
              <ArrowUp strokeWidth={2.6} />
              {c.label}
            </p>
            <span className="fit-grid" />
            <div className="fit-bars">
              {BARS.map((h, i) => (
                <span key={h} className="fit-bar" style={vars({ '--h': `${h}%`, '--i': i })} />
              ))}
              <span className="fit-bar fit-bar-you" style={vars({ '--h': `${YOURS}%`, '--i': BARS.length })} />
            </div>
            <span className="fit-base" />
            <p className="fit-you">{c.you}</p>
            <AgentCursor agent="followup" className="fit-cur" click flip />
          </div>
        </div>
      </div>
    </div>
  );
}
