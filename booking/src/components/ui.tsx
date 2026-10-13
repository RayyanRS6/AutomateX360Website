import { useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { agents, type AgentId } from '../content';
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

/**
 * An AI agent's cursor with its name tag. Decorative: position it absolutely
 * and move it with a scene's own keyframes (transform only). `click` adds the
 * ring a scene can pulse when the agent "clicks".
 */
export function AgentCursor({
  agent,
  className = '',
  style,
  click = false,
  flip = false,
}: {
  agent: AgentId;
  className?: string;
  style?: CSSProperties;
  click?: boolean;
  /** Name tag on the left of the pointer, for paths near a right edge. */
  flip?: boolean;
}) {
  const a = agents[agent];
  return (
    <span aria-hidden className={`agent-cursor tone-${a.tone} ${flip ? 'flip' : ''} ${className}`} style={style}>
      {click && <span className="agent-click" />}
      <svg viewBox="0 0 20 22" className="agent-cursor-arrow">
        <path d="M2.2 1.6 17.6 11.3l-6.9 1.5-3.3 7.1z" />
      </svg>
      <span className="agent-cursor-label">{a.name}</span>
    </span>
  );
}

/**
 * Something hanging from a pin on strings (a sign, a price tag). It sways
 * while on screen and swings when hovered or tapped. `holes` are the x
 * positions (in %) where the strings meet the card; one hole means a single
 * string. `drop` is the string length in px.
 */
export function Hanging({
  children,
  holes = [12, 88],
  drop = 64,
  className = '',
  style,
  label,
  pin,
  string,
}: {
  children: ReactNode;
  holes?: number[];
  drop?: number;
  className?: string;
  style?: CSSProperties;
  /** Text for screen readers (the card itself is treated as an image). */
  label: string;
  /** Pin and string colours, for dark or light backgrounds. */
  pin?: string;
  string?: string;
}) {
  const card = useRef<HTMLDivElement>(null);
  const push = () => {
    const el = card.current;
    if (!el || el.classList.contains('nudge')) return;
    el.classList.add('nudge');
  };
  return (
    <div className={`loop ${className}`} style={style}>
      <div
        ref={card}
        role="img"
        aria-label={label}
        className="hang"
        style={vars({ ...(pin ? { '--pin': pin } : {}), ...(string ? { '--string': string } : {}) })}
        onPointerEnter={push}
        onClick={push}
        onAnimationEnd={(e) => {
          if (e.animationName === 'nudge') e.currentTarget.classList.remove('nudge');
        }}
      >
        <span className="hang-pin" aria-hidden />
        <svg className="hang-strings" style={{ height: drop + 22 }} viewBox={`0 0 100 ${drop + 22}`} preserveAspectRatio="none" aria-hidden>
          {holes.map((x) => (
            <line key={x} x1="50" y1="1" x2={x} y2={drop + 20} />
          ))}
        </svg>
        <div className="relative" style={{ marginTop: drop }}>
          {holes.length > 1 && holes.map((x) => <span key={x} className="hang-hole" style={{ left: `${x}%` }} aria-hidden />)}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Round ember stamp: a short line in the middle, a phrase turning on the ring. */
export function Stamp({ center, ring, className = '' }: { center: string; ring: string; className?: string }) {
  const id = useId();
  return (
    <div className={`loop ${className}`}>
      <div className="stamp size-full" role="img" aria-label={center}>
        <svg className="stamp-ring" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <text className="fill-ink font-mono text-[13px] uppercase tracking-[0.2em]">
            <textPath href={`#${id}`}>{`${ring}${ring}`}</textPath>
          </text>
        </svg>
        <span aria-hidden className="relative max-w-[62%] -rotate-[8deg] text-center text-[clamp(15px,4.2vw,19px)] font-bold leading-[1.1]">
          {center}
        </span>
      </div>
    </div>
  );
}

/** A small tilted icon tile set inside a headline (sized by its font). */
export function HeadingIcon({ children }: { children: ReactNode }) {
  return (
    <span className="h-icon" aria-hidden>
      {children}
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
