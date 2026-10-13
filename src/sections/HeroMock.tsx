import { ArrowRight, Check } from 'lucide-react';
import { hero } from '../content';
import './hero-mock.css';

/**
 * The example homepage inside the hero's laptop and phone, drawn in code in
 * the site's own style (no screenshots). Purely decorative: the meaning is
 * given once by the caption under the hero visual.
 *
 * Laid out in container units, so each screen scales as one piece: the
 * laptop screen is 100 × 62.5 cqw (16:10), the phone screen 100 × 216 cqw.
 */

/** Abstract brand image: a sun, a doorway arch and an ember sphere. */
function MockArt({ className }: { className: string }) {
  return (
    <span className={`mock-art ${className}`}>
      <span className="ma-sun" />
      <span className="ma-line" />
      <span className="ma-arch">
        <span className="ma-arch-in" />
      </span>
      <span className="ma-ball" />
    </span>
  );
}

function BookCard({ className }: { className: string }) {
  const b = hero.mock.book;
  return (
    <span className={`mock-book ${className}`}>
      <span className="min-w-0">
        <span className="mock-book-label">{b.label}</span>
        <span className="mock-book-when">{b.when}</span>
      </span>
      <span className="mock-book-cta">{b.cta}</span>
    </span>
  );
}

/** The homepage on the laptop. Sits inside `.hc` (the container). */
export function DesktopMock() {
  const m = hero.mock;
  return (
    <div className="dm" aria-hidden>
      <span className="dm-grid" />
      <span className="dm-nav">
        <span className="mock-logo">
          <i>{m.initial}</i>
          {m.brand}
        </span>
        <span className="dm-links">
          {m.links.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </span>
        <span className="dm-navcta">{m.navCta}</span>
      </span>

      <span className="dm-eyebrow">
        <i />
        {m.eyebrow}
      </span>
      <span className="dm-h1">
        {m.headline.plain}
        <br />
        <em>{m.headline.em}</em>
      </span>
      <span className="dm-sub">{m.sub}</span>
      <span className="dm-btns">
        <span className="dm-btn">
          {m.primary}
          <ArrowRight strokeWidth={2.6} />
        </span>
        <span className="dm-btn2">{m.secondary}</span>
      </span>
      <span className="dm-feats">
        {m.features.map((f) => (
          <span key={f}>
            <Check strokeWidth={3} />
            {f}
          </span>
        ))}
      </span>

      <MockArt className="dm-art" />
      <BookCard className="dm-book" />
    </div>
  );
}

/** The same homepage on the phone. */
export function PhoneMock() {
  const m = hero.mock;
  return (
    <div className="pm" aria-hidden>
      <span className="pm-nav">
        <span className="mock-logo">
          <i>{m.initial}</i>
          {m.brand}
        </span>
        <span className="pm-burger">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="pm-eyebrow">
        <i />
        {m.eyebrow}
      </span>
      <span className="pm-h1">
        {m.headline.plain}
        <br />
        <em>{m.headline.em}</em>
      </span>
      <span className="pm-sub">
        <i />
        <i />
        <i />
      </span>
      <span className="pm-btn">
        {m.primary}
        <ArrowRight strokeWidth={2.6} />
      </span>
      <MockArt className="pm-art" />
      <BookCard className="pm-book" />
      <span className="pm-bar">{m.navCta}</span>
    </div>
  );
}
