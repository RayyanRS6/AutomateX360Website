import { Check, Inbox, Snail, X } from 'lucide-react';
import { brand, problem } from '../content';
import { AgentCursor, Eyebrow, HeadingIcon, SplitHeading, Stamp, vars } from '../components/ui';
import './problem.css';

/**
 * The problem, told like the ads: the same 11:42 PM question lands in two
 * inboxes. Yours stays silent; ours replies in seconds.
 */
export function Problem() {
  const k = problem.kicker;
  return (
    <section
      aria-labelledby="problem-h"
      className="slab cv-auto relative isolate overflow-hidden bg-ink text-cream"
      style={vars({ '--cis-m': '1280px', '--cis-d': '970px' })}
    >
      <div aria-hidden className="glow-dark pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x py-20 md:py-28">
        <div className="max-w-[46rem]">
          <Eyebrow dark className="reveal">
            {problem.eyebrow}
          </Eyebrow>
          <SplitHeading
            id="problem-h"
            plain={problem.heading.plain}
            em={problem.heading.em}
            emBlock
            className="reveal mt-5 text-[clamp(2.6rem,1.4rem+5.4vw,5.75rem)] leading-[0.93] tracking-[-0.02em]"
          />
          <p className="reveal mt-6 max-w-[34rem] text-[17px] leading-[1.55] text-cream/75 sm:text-[19px]" style={vars({ '--d': '80ms' })}>
            {problem.sub}
          </p>
        </div>

        <ProblemScene />

        <p className="reveal mt-16 text-balance text-center font-serif text-[clamp(2.1rem,1.2rem+3.2vw,4rem)] leading-[1.02] tracking-[-0.015em] md:mt-24">
          {`${k.plain} `}
          <span className="whitespace-nowrap">
            <HeadingIcon>
              <Snail strokeWidth={2.3} />
            </HeadingIcon>{' '}
            <em>{k.em}</em>
          </span>
        </p>
      </div>
    </section>
  );
}

/**
 * Two inboxes on one shared 9s cycle (the .loop is the grid around both, so
 * they always play in step). The chats are real text for screen readers; the
 * cursor and typing bubble are decorative. Resting markup = the finished
 * scene, which is what lite devices, reduced motion and the prerender show.
 */
function ProblemScene() {
  const wo = problem.without;
  const w = problem.with;
  return (
    <div className="pr-scene loop">
      {/* Without: the question, a nudge, then nothing. */}
      <div className="pr-panel pr-without glass-dark reveal">
        <div className="pr-head">
          <span aria-hidden className="pr-tile">
            <Inbox strokeWidth={2.2} />
          </span>
          <h3 className="pr-label mono-label">{wo.label}</h3>
        </div>
        <div className="pr-body">
          <ol className="pr-chat">
            {wo.messages.map((m, i) => (
              <li key={m.time} className={`pr-msg pr-them ${i === 0 ? 'pr-a-ask' : 'pr-a-hello'}`}>
                <p className="bubble bubble-cream">{m.text}</p>
                <span className="pr-time">{m.time}</span>
              </li>
            ))}
          </ol>
          <p className="pr-noreply">{wo.status}</p>
        </div>
        <p className="pr-outcome pr-a-out-without">
          <span aria-hidden className="pr-outcome-ico">
            <X strokeWidth={2.6} />
          </span>
          {wo.outcome}
        </p>
      </div>

      {/* With: the Reply agent answers within seconds. */}
      <div className="pr-panel pr-with reveal" style={vars({ '--d': '120ms' })}>
        <div className="pr-head">
          <span aria-hidden className="pr-tile pr-tile-brand">
            {brand.name.charAt(0)}
          </span>
          <h3 className="pr-label mono-label">{w.label}</h3>
        </div>
        <div className="pr-body">
          <ol className="pr-chat">
            <li className="pr-msg pr-them pr-a-ask">
              <p className="bubble bubble-cream">{w.ask.text}</p>
              <span className="pr-time">{w.ask.time}</span>
            </li>
            <li className="pr-msg pr-us">
              {/* Sized to the reply bubble: the typing bubble and the cursor are
                  anchored to its bottom-right corner, so they land at any width. */}
              <div className="pr-reply">
                <p className="bubble bubble-ember pr-a-reply">{w.answer.text}</p>
                <span aria-hidden className="pr-typing bubble bubble-ember">
                  <span className="typing">
                    <i style={vars({ '--i': 0 })} />
                    <i style={vars({ '--i': 1 })} />
                    <i style={vars({ '--i': 2 })} />
                  </span>
                </span>
                <AgentCursor agent="reply" className="pr-cur" click flip />
              </div>
              <span className="pr-time pr-a-reply-time">{w.answer.time}</span>
              <p className="pr-pill pr-a-pill">
                <span aria-hidden className="live-dot" />
                {w.status}
              </p>
            </li>
          </ol>
        </div>
        <p className="pr-outcome pr-a-out-with">
          <span aria-hidden className="pr-outcome-ico">
            <Check strokeWidth={3} />
          </span>
          {w.outcome}
        </p>
        {/* Last in reading order; placed over the card's top-right corner. */}
        <Stamp center={problem.stamp.center} ring={problem.stamp.ring} className="pr-stamp" />
      </div>
    </div>
  );
}
