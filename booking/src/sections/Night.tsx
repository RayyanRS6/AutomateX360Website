import type { ReactNode } from 'react';
import { Moon, MoonStar, Sun, Sunrise } from 'lucide-react';
import { night } from '../content';
import { AgentCursor, Eyebrow, Hanging, HeadingIcon, vars } from '../components/ui';
import './night.css';

/**
 * While you sleep: the "Yes, we're Open" sign from the ads, an example night
 * hour by hour, and the week's board filling up with bookings. The board is
 * the only loop: while it is on screen the Booking agent books it chip by chip.
 */
export function Night() {
  return (
    <section
      id="night"
      aria-labelledby="night-h"
      className="slab cv-auto relative isolate overflow-hidden bg-ink py-20 text-cream md:py-28"
      style={vars({ '--cis-m': '1520px', '--cis-d': '1080px' })}
    >
      <div aria-hidden className="glow-dark pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="night-stars pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-14 lg:grid-cols-12 lg:items-center lg:gap-x-10">
          <div className="reveal relative flex justify-center lg:col-span-5">
            <span aria-hidden className="night-sign-glow" />
            <OpenSign />
          </div>

          <div className="@container min-w-0 lg:col-span-7">
            <Eyebrow dark className="reveal">
              {night.eyebrow}
            </Eyebrow>
            {/* Sized to the column so the upright phrase stays on one line from tablet up. */}
            <h2
              id="night-h"
              className="reveal mt-5 font-serif text-[clamp(2.6rem,8.8cqi,4.6rem)] leading-[0.96] tracking-[-0.018em]"
              style={vars({ '--d': '60ms' })}
            >
              {`${night.heading.plain} `}
              <em className="block">
                <EndTile text={night.heading.em}>
                  <MoonStar strokeWidth={2.4} />
                </EndTile>
              </em>
            </h2>
            <Timeline />
          </div>
        </div>

        <Board />
      </div>
    </section>
  );
}

/** Text ending in an inline icon tile; the last word and the tile never part. */
function EndTile({ text, children }: { text: string; children: ReactNode }) {
  const i = text.lastIndexOf(' ');
  return (
    <>
      {text.slice(0, i + 1)}
      <span className="whitespace-nowrap">
        {`${text.slice(i + 1)} `}
        <HeadingIcon>{children}</HeadingIcon>
      </span>
    </>
  );
}

/** The cream "Yes, we're Open" sign, hanging from a pin on two strings. */
function OpenSign() {
  const s = night.sign;
  return (
    <Hanging
      label={`${s.top} ${s.word}. ${s.bottom}`}
      holes={[12, 88]}
      drop={56}
      pin="var(--color-paper)"
      string="rgb(236 231 223 / 0.5)"
      className="night-sign"
      style={vars({ '--r0': '-3deg', '--r1': '1.8deg', '--dur': '6.5s' })}
    >
      <div aria-hidden className="night-sign-card paper-card">
        <span className="paper-card-inner" />
        <p className="mono-label night-sign-top">{s.top}</p>
        <p className="night-sign-word">{s.word}</p>
        <svg className="night-sign-line" viewBox="0 0 200 14">
          <path d="M4 9.5C48 4.6 116 3 196 6.6" />
        </svg>
        <p className="night-sign-bottom">{s.bottom}</p>
      </div>
    </Hanging>
  );
}

/**
 * The example night as a real list. Your own moments (closing up, opening
 * the calendar) are marked in fog; the website's work in between in ember.
 */
function Timeline() {
  const last = night.timeline.length - 1;
  return (
    <div className="nt mt-10 sm:mt-12">
      <span aria-hidden className="nt-cap nt-moon">
        <Moon strokeWidth={2.2} />
      </span>
      <ol className="nt-list">
        {night.timeline.map((t, i) => (
          <li
            key={t.time}
            className={`nt-item reveal ${i === 0 || i === last ? 'is-you' : 'is-site'}`}
            style={vars({ '--d': `${80 + i * 70}ms` })}
          >
            <span aria-hidden className="nt-dot" />
            <p className="nt-time">{t.time}</p>
            <p className="nt-title">{t.title}</p>
            <p className="nt-body">{t.body}</p>
          </li>
        ))}
      </ol>
      <span aria-hidden className="nt-cap nt-sun">
        <Sun strokeWidth={2.2} />
      </span>
    </div>
  );
}

/**
 * "Wake up to a full calendar.": the ad's black week board. The heading says
 * what it shows, so the board itself is decorative.
 */
function Board() {
  const b = night.board;
  // The Booking agent books the week day by day, down one column and up the
  // next. Each booked chip gets its place in that order (nb-k0, nb-k1…), which
  // night.css uses to time the chip and aim the cursor path.
  const order = b.grid.map((row) => row.map(() => -1));
  let k = 0;
  b.days.forEach((_day, c) => {
    for (let n = 0; n < b.grid.length; n++) {
      const r = c % 2 ? b.grid.length - 1 - n : n;
      if (b.grid[r][c]) order[r][c] = k++;
    }
  });

  return (
    <div className="mt-16 lg:mt-24">
      <h3 className="nb-title reveal font-serif text-[clamp(2.1rem,1.5rem+2.2vw,3.5rem)] leading-none tracking-[-0.015em]">
        <EndTile text={b.title}>
          <Sunrise strokeWidth={2.4} />
        </EndTile>
      </h3>
      <div className="reveal mt-6 sm:mt-8" style={vars({ '--d': '80ms' })}>
        <div aria-hidden className="nb loop">
          <div className="nb-board">
            {b.days.map((d) => (
              <span key={d} className="nb-day">
                {d}
              </span>
            ))}
            {b.grid.map((row, r) =>
              row.map((on, c) => (
                <span key={`${r}-${c}`} className="nb-cell">
                  {on ? <span className={`nb-chip nb-k${order[r][c]}`}>{b.booked}</span> : null}
                </span>
              )),
            )}
            <AgentCursor agent="booking" className="nb-cur" click flip />
          </div>
        </div>
      </div>
    </div>
  );
}
