import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { goToBooking } from '../lib/motion';
import manifest from '../work-manifest.json';

type Manifest = Record<string, { fullRatio?: number }>;
export const workManifest = manifest as Manifest;

/** Inline style helper that accepts CSS custom properties. */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** The single action on the page: every CTA scrolls to the booking card. */
export function CtaLink({
  children,
  size = 'lg',
  tone = 'ember',
  className = '',
}: {
  children: ReactNode;
  size?: 'lg' | 'sm';
  tone?: 'ember' | 'ink';
  className?: string;
}) {
  return (
    <a
      href="#book"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        goToBooking(e);
      }}
      className={`btn-cta ${size === 'sm' ? 'btn-cta-sm' : ''} ${tone === 'ink' ? 'btn-cta-ink' : ''} ${className}`}
    >
      {children}
      <ArrowRight className="arrow" size={size === 'sm' ? 16 : 19} strokeWidth={2.4} aria-hidden />
    </a>
  );
}

export function Eyebrow({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <p className={`eyebrow ${dark ? 'eyebrow-dark' : ''} ${className}`}>{children}</p>;
}

/** Section heading in the ad style: upright phrase, then an italic phrase. */
export function SplitHeading({
  id,
  plain,
  em,
  className = '',
  emBlock = false,
  as: Tag = 'h2',
}: {
  id?: string;
  plain: string;
  em: string;
  className?: string;
  /** Put the italic phrase on its own line. */
  emBlock?: boolean;
  as?: 'h2' | 'h3';
}) {
  // The space lives in the same text node as the phrase: separate nodes get a
  // comment between them when prerendered, and screen readers then drop it.
  return (
    <Tag id={id} className={`font-serif ${className}`}>
      {`${plain} `}
      <em className={emBlock ? 'block' : undefined}>{em}</em>
    </Tag>
  );
}

/** Black tag with the struck-through price, sized by the surrounding font. */
export function PriceTag({ price }: { price: string }) {
  return (
    <span className="price-tag">
      <span>{price}</span>
      <span className="strike" aria-hidden />
    </span>
  );
}

export function BrowserFrame({ url, children, className = '' }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={`browser ${className}`}>
      <div className="browser-bar" aria-hidden>
        <i />
        <i />
        <i />
        <span className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-white/85 px-3 py-[3px] text-[10px] font-medium text-ink/70">
          <Lock size={8} strokeWidth={2.6} aria-hidden />
          <span className="truncate">{url}</span>
        </span>
        <span className="w-[39px]" />
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">{children}</div>
    </div>
  );
}

/** srcset for a processed portfolio image in /public/work. */
export function workSrcSet(slug: string, kind: string, widths: number[]) {
  return widths.map((w) => `/work/${slug}-${kind}-${w}.webp ${w}w`).join(', ');
}
export const workSrc = (slug: string, kind: string, width: number) => `/work/${slug}-${kind}-${width}.webp`;
