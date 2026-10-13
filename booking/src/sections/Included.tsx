import type { ReactNode } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  Check,
  CheckCheck,
  ConciergeBell,
  LayoutTemplate,
  Mail,
  MessageCircle,
  SendHorizontal,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { agents, included, type AgentId } from '../content';
import { AgentCursor, Eyebrow, HeadingIcon, vars } from '../components/ui';
import './included.css';

type Item = (typeof included.items)[number];
type Art = Item['art'];
/** One item's art, typed with the fields that item actually has. */
type ArtWith<K extends keyof Art> = Extract<Art, Record<K, NonNullable<Art[K]>>>;
type SceneProps = { art: Art; agent: AgentId };

const agentOf = (id: string): AgentId => (id in agents ? (id as AgentId) : 'reply');

/**
 * Layout per item. Desktop bento: the site and chatbot cards share row one
 * (3 + 3 of 6 columns), the other three share row two (2 + 2 + 2). Tablet:
 * the site card spans both columns and lies on its side. Phones: one column.
 */
const CARDS: Record<string, { span: string; tile: string; Icon: LucideIcon; Scene: (p: SceneProps) => ReactNode; row1?: boolean; split?: boolean; d: number }> = {
  site: { span: 'sm:col-span-2 lg:col-span-3', tile: 'ink', Icon: LayoutTemplate, Scene: SiteScene, row1: true, split: true, d: 0 },
  chatbot: { span: 'lg:col-span-3', tile: 'ember', Icon: Bot, Scene: ChatScene, row1: true, d: 90 },
  followups: { span: 'lg:col-span-2', tile: 'sun', Icon: Mail, Scene: FollowScene, d: 0 },
  calendar: { span: 'lg:col-span-2', tile: 'ember', Icon: CalendarCheck2, Scene: CalendarScene, d: 90 },
  whatsapp: { span: 'lg:col-span-2', tile: 'go', Icon: MessageCircle, Scene: WhatsAppScene, d: 180 },
};

export function Included() {
  const h = included.heading;
  return (
    <section
      id="included"
      aria-labelledby="included-h"
      className="cv-auto relative isolate pb-20 pt-20 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28"
      style={vars({ '--cis-m': '2010px', '--cis-d': '1040px' })}
    >
      <div aria-hidden className="inc-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x">
        <div className="grid gap-y-5 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <div className="lg:col-span-7">
            <Eyebrow className="reveal">{included.eyebrow}</Eyebrow>
            <h2 id="included-h" className="reveal mt-5 font-serif text-h2" style={vars({ '--d': '60ms' })}>
              {`${h.plain} `}
              <HeadingIcon>
                <ConciergeBell strokeWidth={2.3} />
              </HeadingIcon>
              {' '}
              <em>{h.em}</em>
            </h2>
          </div>
          <p className="reveal max-w-[30rem] text-[17px] leading-[1.6] text-stone lg:col-span-5 lg:justify-self-end lg:pb-1.5 lg:text-[18px]" style={vars({ '--d': '120ms' })}>
            {included.intro}
          </p>
        </div>

        <ul role="list" className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:mt-14 lg:grid-cols-6">
          {included.items.map((item) => (
            <Card key={item.key} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({ item }: { item: Item }) {
  const c = CARDS[item.key];
  const Icon = c?.Icon ?? Check;
  const Scene = c?.Scene;
  return (
    <li className={`reveal min-w-0 ${c?.span ?? 'lg:col-span-2'}`} style={vars({ '--d': `${c?.d ?? 0}ms` })}>
      <div className={`inc-card ${c?.row1 ? 'inc-row1' : ''} ${c?.split ? 'inc-split' : ''}`}>
        {Scene && (
          <div className="inc-art" aria-hidden>
            <Scene art={item.art} agent={agentOf(item.agent)} />
          </div>
        )}
        <div className="inc-copy">
          <h3 className="flex items-start gap-3 text-[18.5px] font-semibold leading-[1.28] tracking-[-0.012em] sm:text-[19.5px] lg:text-[20px]">
            <span aria-hidden className={`inc-tile inc-tile-${c?.tile ?? 'ember'}`}>
              <Icon strokeWidth={2.3} />
            </span>
            <span className="min-w-0 pt-[3px]">{item.title}</span>
          </h3>
          <p className="mt-2.5 text-[15px] leading-[1.55] text-stone sm:text-[15.5px]">{item.body}</p>
        </div>
      </div>
    </li>
  );
}

/* ── The scenes ──────────────────────────────────────────────────────────
   Decorative (the card's title and body say what each one shows). Every
   piece is placed on a 100 × 56 stage in included.css; resting = finished. */

/** Website agent drags the "Book now" block into its slot; the page updates. */
function SiteScene({ art, agent }: SceneProps) {
  const a = art as ArtWith<'blocks'>;
  const [hero, services, book] = a.blocks;
  return (
    <div className="inc-scene inc-site loop">
      <div className="inc-stage">
        <div className="inc-site-win">
          <div className="inc-site-bar">
            <i />
            <i />
            <i />
            <span className="inc-site-url">{a.url}</span>
          </div>
        </div>
        <span className="inc-site-status inc-a">
          <span className="inc-site-check inc-a">
            <Check strokeWidth={3.4} />
          </span>
          {a.status}
        </span>

        <span className="inc-blk inc-blk-hero">
          <span className="inc-blk-label">{hero}</span>
          <span className="inc-sk inc-sk-1" />
          <span className="inc-sk inc-sk-2" />
          <span className="inc-sk inc-sk-3" />
        </span>
        <span className="inc-blk inc-blk-svc">
          <span className="inc-blk-label">{services}</span>
          <span className="inc-svc-tiles">
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="inc-blk inc-slot" />
        <span className="inc-blk inc-blk-book inc-a">
          <span className="inc-blk-label">{book}</span>
          <span className="inc-book-btn">
            <ArrowRight strokeWidth={2.6} />
          </span>
        </span>

        <AgentCursor agent={agent} click flip />
      </div>
    </div>
  );
}

/** Reply agent answers, then books the 1:30 PM slot. */
function ChatScene({ art, agent }: SceneProps) {
  const a = art as ArtWith<'ask'>;
  return (
    <div className="inc-scene inc-chat loop">
      <div className="inc-stage">
        <span className="inc-chat-panel" />
        <span className="inc-chat-ask bubble bubble-cream inc-a">{a.ask}</span>
        <span className="inc-chat-typing bubble bubble-us inc-a">
          <span className="typing">
            <i style={vars({ '--i': 0 })} />
            <i style={vars({ '--i': 1 })} />
            <i style={vars({ '--i': 2 })} />
          </span>
        </span>
        <span className="inc-chat-answer bubble bubble-us inc-a">
          {a.answer}
          <span className="inc-chip inc-chip-1">{a.other}</span>
          <span className="inc-chip inc-chip-2">
            {a.slot}
            <span className="inc-chip-on inc-a">{a.slot}</span>
          </span>
        </span>
        <span className="inc-chat-booked bubble bubble-ember inc-a">
          <Check strokeWidth={3.2} />
          {a.booked}
        </span>
        <AgentCursor agent={agent} click />
      </div>
    </div>
  );
}

/** Follow-up agent sends three emails, one after another. */
function FollowScene({ art, agent }: SceneProps) {
  const a = art as ArtWith<'emails'>;
  return (
    <div className="inc-scene inc-follow loop">
      <div className="inc-stage">
        {a.emails.slice(0, 3).map((m, i) => (
          <span key={m.subject} className={`inc-mail inc-mail-${i + 1}`}>
            <span className="inc-mail-ico">
              <Mail strokeWidth={2.3} />
            </span>
            <span className="inc-mail-text">
              <span className="inc-mail-subj">{m.subject}</span>
              <span className="inc-mail-meta">{m.meta}</span>
            </span>
            <span className="inc-mail-dot" />
            <span className="inc-mail-sent inc-a">
              <Check strokeWidth={3.4} />
              {a.sent}
            </span>
          </span>
        ))}
        <AgentCursor agent={agent} click flip />
      </div>
    </div>
  );
}

/**
 * The week board, row by row: 1 = booked, 0 = still free (dashed),
 * 2–4 = booked by the agent during the loop, in that order.
 */
const CAL_GRID = [
  [1, 2, 0, 1, 1],
  [1, 1, 3, 1, 0],
  [0, 4, 1, 1, 1],
];

/** Booking agent drops three new bookings into the week. */
function CalendarScene({ art, agent }: SceneProps) {
  const a = art as ArtWith<'days'>;
  return (
    <div className="inc-scene inc-calendar loop">
      <div className="inc-stage">
        <div className="inc-cal-board">
          <div className="inc-cal-grid">
            {a.days.slice(0, 5).map((d) => (
              <span key={d} className="inc-cal-day">
                {d}
              </span>
            ))}
            {CAL_GRID.flat().map((c, i) =>
              c === 0 ? (
                <span key={i} className="inc-cell inc-cell-empty" />
              ) : c === 1 ? (
                <span key={i} className="inc-cell inc-cell-on">
                  {a.booked}
                </span>
              ) : (
                <span key={i} className="inc-cell inc-cell-empty">
                  <span className={`inc-cell inc-cell-on inc-cell-drop inc-drop-${c - 1} inc-a`}>{a.booked}</span>
                </span>
              ),
            )}
          </div>
        </div>
        <AgentCursor agent={agent} click />
      </div>
    </div>
  );
}

/** Reply agent taps the WhatsApp button; the chat opens and a message lands. */
function WhatsAppScene({ art, agent }: SceneProps) {
  const a = art as ArtWith<'button'>;
  return (
    <div className="inc-scene inc-wa loop">
      <div className="inc-stage">
        <span className="inc-wa-site">
          <i className="inc-wa-logo" />
          <i className="inc-wa-nav inc-wa-nav-1" />
          <i className="inc-wa-nav inc-wa-nav-2" />
          <i className="inc-wa-h inc-wa-h-1" />
          <i className="inc-wa-h inc-wa-h-2" />
          <i className="inc-wa-t inc-wa-t-1" />
          <i className="inc-wa-t inc-wa-t-2" />
        </span>
        <span className="inc-wa-btn inc-a">
          <MessageCircle strokeWidth={2.4} />
          {a.button}
        </span>

        <span className="inc-wa-phone">
          <span className="inc-wa-screen">
            <span className="inc-wa-head">
              <span className="inc-wa-who inc-a">
                <span className="inc-wa-avatar">
                  <Store strokeWidth={2.3} />
                </span>
                <span className="inc-wa-online">
                  <span className="live-dot" />
                  {a.online}
                </span>
              </span>
            </span>
            <span className="inc-wa-msg inc-a">
              {a.message}
              <CheckCheck className="inc-wa-ticks" strokeWidth={2.4} />
            </span>
            <span className="inc-wa-input">
              <span className="inc-wa-send">
                <SendHorizontal strokeWidth={2.4} />
              </span>
            </span>
          </span>
        </span>

        <AgentCursor agent={agent} click />
      </div>
    </div>
  );
}
