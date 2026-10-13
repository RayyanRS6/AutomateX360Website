import { brand, cta, pricing } from '../content';
import { AgentCursor, CtaLink, Eyebrow, SplitHeading, vars } from '../components/ui';
import './pricing.css';

/**
 * The price, set as the ticket from the ad: what's included on the left, a
 * perforation, and the stub with the price on the right (stacked on phones).
 * The Booking agent glides from the price down to the call to action.
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-h"
      className="cv-auto relative overflow-clip pb-24 pt-20 md:pb-32 md:pt-28"
      style={vars({ '--cis-m': '930px', '--cis-d': '760px' })}
    >
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="reveal">{pricing.eyebrow}</Eyebrow>
          <SplitHeading id="pricing-h" plain={pricing.heading.plain} em={pricing.heading.em} className="reveal mt-5 text-h2" />
          <p className="reveal mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-stone sm:text-lg" style={vars({ '--d': '80ms' })}>
            {pricing.sub}
          </p>
        </div>

        <Ticket />
      </div>
    </section>
  );
}

/**
 * One .loop around the ticket and the CTA, so the agent's path from the price
 * to the button is measured inside the same box at every width (see
 * pricing.css). Resting markup = the finished scene: the agent on the button.
 */
function Ticket() {
  const t = pricing.ticket;
  return (
    <div className="tk-scene loop mt-14 sm:mt-16">
      <div className="reveal relative z-[2]" style={vars({ '--d': '120ms' })}>
        <div className="tk-ticket">
          <div className="tk-main">
            <p className="tk-kicker">{brand.tagline}</p>
            <ul className="tk-items">
              {t.items.map((item) => (
                <li key={item}>
                  <span aria-hidden className="tk-bullet" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Spaces sit inside each phrase's own text node so the line reads
              "All of it $449 a month 3-month minimum" once prerendered. */}
          <p className="tk-stub">
            <span className="tk-top">{`${t.top} `}</span>
            <span className="tk-amount">{`${t.amount} `}</span>
            <span className="tk-lower">
              <span className="tk-unit">{`${t.unit} `}</span>
              <span className="tk-note">{t.note}</span>
            </span>
          </p>

          <span aria-hidden className="tk-sticky sticky-note">
            {pricing.sticky}
          </span>
          <span aria-hidden className="tk-path">
            <AgentCursor agent="booking" className="tk-cur" click flip />
          </span>
        </div>
      </div>

      <div data-cta-zone className="tk-cta reveal relative flex flex-col items-center gap-5 text-center" style={vars({ '--d': '180ms' })}>
        <CtaLink className="w-full sm:w-auto">{cta.label}</CtaLink>
        <p className="max-w-md text-[14.5px] leading-relaxed text-stone">{pricing.smallPrint}</p>
      </div>
    </div>
  );
}
