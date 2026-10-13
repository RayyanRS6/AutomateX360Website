import { useEffect, useState } from 'react';
import { cta } from '../content';
import { CtaLink } from './ui';

/**
 * Thumb-reach CTA for phones. Appears once the hero's booking card has
 * scrolled away, and hides again wherever another booking prompt is already
 * on screen (elements marked data-cta-zone).
 */
export function MobileCtaBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const zones = Array.from(document.querySelectorAll('[data-cta-zone]'));
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setShow(visible.size === 0);
    });
    zones.forEach((z) => io.observe(z));
    return () => io.disconnect();
  }, []);

  return (
    <div
      inert={!show}
      className={`fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 transition-[translate,opacity] duration-500 ease-[var(--ease-soft)] md:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[140%] opacity-0'
      }`}
    >
      <div className="glass-bar flex items-center justify-between gap-3 rounded-full py-1.5 pl-5 pr-1.5">
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13.5px] font-semibold">{cta.mobileBar.title}</p>
          <p className="truncate text-[12px] text-ink/70">{cta.mobileBar.sub}</p>
        </div>
        <CtaLink size="sm">{cta.label}</CtaLink>
      </div>
    </div>
  );
}
