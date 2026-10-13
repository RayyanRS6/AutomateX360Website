import { useEffect, useState } from 'react';
import { brand, cta } from '../content';
import { CtaLink } from './ui';

/** Floating pill header. No menu on purpose: the only action is booking. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="container-x">
        <div className="relative flex h-14 items-center justify-between gap-4 pl-5 pr-2 sm:h-[60px] sm:pl-6">
          <div
            aria-hidden
            className={`glass-bar absolute inset-0 rounded-full transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Until the pill appears, the wordmark lines up with the page content. */}
          <a
            href="#top"
            className={`wordmark relative transition-transform duration-300 ${scrolled ? '' : '-translate-x-5 sm:-translate-x-6'}`}
            aria-label={`${brand.name}, back to top`}
          >
            {brand.name}
          </a>
          <p className="relative mr-3 hidden whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink/70 min-[390px]:block sm:mr-0 sm:text-[11px] sm:tracking-[0.24em]">
            {brand.tagline}
          </p>
          <CtaLink size="sm" tone="ink" className="relative hidden md:inline-flex">
            {cta.label}
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
