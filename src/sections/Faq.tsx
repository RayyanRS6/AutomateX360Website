import { useState } from 'react';
import { Plus } from 'lucide-react';
import { faq } from '../content';
import { Eyebrow, SplitHeading, vars } from '../components/ui';

export function Faq() {
  return (
    <section aria-labelledby="faq-h" className="cv-auto relative pb-24 pt-8 md:pb-32 md:pt-12" style={vars({ '--cis-m': '716px', '--cis-d': '511px' })}>
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <Eyebrow className="reveal">{faq.eyebrow}</Eyebrow>
          <SplitHeading id="faq-h" plain={faq.heading.plain} em={faq.heading.em} className="reveal mt-5 text-h2" />
          <p className="reveal mt-5 max-w-xs text-[16px] leading-relaxed text-stone" style={vars({ '--d': '80ms' })}>
            {faq.intro}
          </p>
        </div>
        <ul className="reveal border-t border-ink/12 lg:col-span-8" style={vars({ '--d': '120ms' })}>
          {faq.items.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} i={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${i}`;
  return (
    <li className="border-b border-ink/12">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center justify-between gap-6 py-6 text-left text-[17px] font-semibold leading-snug sm:text-[19px]"
        >
          {q}
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-full border transition-[rotate,background-color,color,border-color] duration-300 ${
              open ? 'rotate-45 border-ink bg-ink text-cream' : 'border-ink/15 group-hover:rotate-90 group-hover:border-ink/40'
            }`}
          >
            <Plus size={16} strokeWidth={2.4} />
          </span>
        </button>
      </h3>
      <div id={id} className="accordion-panel" data-open={open} inert={!open}>
        <div>
          <p className="max-w-2xl pb-7 pr-12 text-[16px] leading-relaxed text-stone sm:text-[17px]">{a}</p>
        </div>
      </div>
    </li>
  );
}
