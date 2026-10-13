import { useEffect, useState } from 'react';
import { brand, cta, siteNav } from '../content';
import { CtaLink } from './ui';

const siteTab =
  'block whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3.5 sm:text-[11px] sm:tracking-[0.2em]';

/** Floating pill header: the wordmark, a switch between our two sites, and booking. */
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
          <nav aria-label={siteNav.label} className="relative">
            <ul className="flex items-center rounded-full bg-ink/[0.06] p-1">
              {siteNav.sites.map((site) => {
                const label = (
                  <>
                    <span className="lg:hidden">{site.short}</span>
                    <span className="hidden lg:inline">{site.name}</span>
                  </>
                );
                // Under 360px only the link to the other site fits next to the wordmark.
                return (
                  <li key={site.id} className={site.id === siteNav.current ? 'max-[359px]:hidden' : undefined}>
                    {site.id === siteNav.current ? (
                      <span aria-current="page" className={`${siteTab} bg-ink text-cream`}>
                        {label}
                      </span>
                    ) : (
                      <a href={site.href} className={`${siteTab} text-ink/70 hover:bg-ink/[0.06] hover:text-ink`}>
                        {label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <CtaLink size="sm" tone="ink" className="relative hidden md:inline-flex">
            {cta.label}
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
