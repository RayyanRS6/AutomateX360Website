import { Heart, Phone } from 'lucide-react';
import { cta, offer } from '../content';
import { CtaLink, Eyebrow, SplitHeading, vars } from '../components/ui';

export function Offer() {
  return (
    <section aria-labelledby="offer-h" className="cv-auto relative pb-24 md:pb-32" style={vars({ '--cis-m': '1370px', '--cis-d': '770px' })}>
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="reveal">{offer.eyebrow}</Eyebrow>
          <SplitHeading id="offer-h" plain={offer.heading.plain} em={offer.heading.em} emBlock className="reveal mt-5 text-h2" />
        </div>

        {/* Three across only from 1024px: narrower columns clip the illustrations. */}
        <ol className="mx-auto mt-12 grid max-w-xl gap-4 md:mt-16 lg:max-w-none lg:grid-cols-3 lg:gap-6">
          {offer.steps.map((s, i) => (
            <li
              key={s.title}
              className="reveal flex flex-col rounded-[28px] bg-paper p-2 shadow-[0_30px_60px_-40px_rgb(17_17_17/0.4)] ring-1 ring-ink/5"
              style={vars({ '--d': `${i * 110}ms` })}
            >
              <div className="relative h-[184px] overflow-hidden rounded-[22px] bg-cream/80 sm:h-[200px]">
                {i === 0 && <CallArt />}
                {i === 1 && <DesignArt />}
                {i === 2 && <DecideArt />}
                <span className="absolute left-3.5 top-3.5 grid size-9 place-items-center rounded-[11px] bg-ink text-[15px] font-semibold text-cream shadow-[0_8px_16px_-6px_rgb(17_17_17/0.6)]">
                  {i + 1}
                </span>
              </div>
              <div className="px-4 pb-5 pt-6 sm:px-5">
                <h3 className="font-serif text-h3">{s.title}</h3>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-stone">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div data-cta-zone className="reveal mt-12 flex flex-col items-center gap-3.5 text-center md:mt-14">
          <CtaLink className="w-full sm:w-auto">{cta.label}</CtaLink>
          <p className="text-[14px] text-stone">{offer.ctaNote}</p>
        </div>
      </div>
    </section>
  );
}

const WAVE =[6, 14, 22, 12, 26, 18, 9, 20, 28, 16, 10, 22, 14, 7];
const a = offer.art;

/** Step 1: a call in progress. */
function CallArt() {
  return (
    <div className="absolute inset-0 grid place-items-center px-5 pt-6" aria-hidden>
      <div className="glass-soft w-full max-w-[290px] rounded-2xl p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-ink/70">
          <span className="flex items-center gap-1.5">
            <Phone size={12} /> {a.call}
          </span>
          <span className="font-mono">{a.timer}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-ink text-[11px] font-semibold text-cream">{a.you}</span>
          <span className="loop wave flex h-8 flex-1 items-center justify-center gap-[3px]">
            {WAVE.map((h, i) => (
              <i key={i} className="w-[3px] rounded-full bg-ember" style={vars({ height: `${h}px`, '--i': i })} />
            ))}
          </span>
          <span className="grid size-11 place-items-center rounded-full bg-ember font-serif text-xl italic text-ink">{a.us}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px] font-medium text-ink/65">
          {a.topics.map((t) => (
            <span key={t} className="rounded-full bg-ink/[0.06] px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Step 2: a homepage going from wireframe to design. */
function DesignArt() {
  return (
    <div className="absolute inset-x-5 bottom-0 top-12 overflow-hidden rounded-t-xl bg-white shadow-[0_20px_40px_-20px_rgb(17_17_17/0.35)] ring-1 ring-ink/5" aria-hidden>
      <div className="flex items-center gap-1 border-b border-ink/5 px-2.5 py-1.5">
        <i className="size-1.5 rounded-full bg-ink/15" />
        <i className="size-1.5 rounded-full bg-ink/15" />
        <i className="size-1.5 rounded-full bg-ink/15" />
        {/* Sits in the empty chrome bar so it never covers the mock's headline. */}
        <span className="ml-auto rounded-full bg-[#157244] px-2 text-[9.5px] font-bold leading-[15px] text-white">{a.free}</span>
      </div>
      <div className="grid h-full grid-cols-2">
        <div className="space-y-2 border-r border-dashed border-ink/15 p-3">
          <div className="h-1.5 w-1/2 rounded bg-ink/10" />
          <div className="mt-3 h-2.5 w-[85%] rounded bg-ink/12" />
          <div className="h-2.5 w-[60%] rounded bg-ink/12" />
          <div className="mt-2 h-12 rounded-md border border-dashed border-ink/20" />
          <div className="h-3 w-1/3 rounded-full border border-dashed border-ink/25" />
        </div>
        <div className="space-y-2 bg-[#1c1a17] p-3">
          <div className="h-1.5 w-1/2 rounded bg-white/25" />
          <p className="mt-2 font-serif text-[17px] leading-[1.02] text-[#f3eee6]">
            {`${a.mock.plain} `}
            <em>{a.mock.em}</em>
          </p>
          <div className="h-12 rounded-md bg-[linear-gradient(135deg,#c9a27a,#6d5440)]" />
          <div className="h-3 w-[45%] rounded-full bg-ember" />
        </div>
      </div>
    </div>
  );
}

/** Step 3: love it, or walk away owing nothing. */
function DecideArt() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 pt-6" aria-hidden>
      <div className="relative flex w-full max-w-[260px] items-center justify-between rounded-full bg-ember px-4 py-2.5 text-[13px] font-semibold text-ink shadow-[0_12px_24px_-12px_rgb(240_68_30/0.9)]">
        <span className="flex items-center gap-1.5">
          <Heart size={14} fill="currentColor" /> {a.love}
        </span>
        <span>{a.build}</span>
        <svg className="absolute -bottom-4 right-6 size-6 drop-shadow" viewBox="0 0 24 24">
          <path d="M5 3l14 7-6 2-2 6z" fill="#111" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex w-full max-w-[260px] items-center justify-between rounded-full border border-ink/15 bg-white/60 px-4 py-2.5 text-[13px] font-medium text-ink/75">
        <span>{a.no}</span>
        <span>{a.owe}</span>
      </div>
    </div>
  );
}