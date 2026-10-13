import { ChevronLeft, ChevronRight } from 'lucide-react';
import { booking } from '../../content';
import { bookingWindow, dateIn, fmt, isBookable, monthGrid, sameDay, weekdayLabels } from '../../lib/booking';

type Props = {
  now: Date;
  /** The visitor's time zone: days, "today" and availability are read in it. */
  timeZone: string;
  month: Date;
  onMonth: (m: Date) => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
};

/** Month view. Only days with open times (in the visitor's zone) are clickable. */
export function Calendar({ now, timeZone, month, onMonth, selected, onSelect }: Props) {
  const { first, last } = bookingWindow(now, timeZone);
  const today = dateIn(now, timeZone);
  const cells = monthGrid(month);
  const canPrev = month > new Date(first.getFullYear(), first.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= last;
  const shift = (n: number) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  // aria-disabled (not disabled) keeps focus on the button when it becomes
  // unavailable, instead of dropping it to the page body.
  const navBtn =
    'grid size-10 place-items-center rounded-full border border-ink/15 transition hover:bg-ink/5 aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-transparent';

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold" aria-live="polite">
          {fmt.month(month)}
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={() => canPrev && shift(-1)} aria-disabled={!canPrev} aria-label={booking.a11y.prevMonth} className={navBtn}>
            <ChevronLeft size={17} aria-hidden />
          </button>
          <button type="button" onClick={() => canNext && shift(1)} aria-disabled={!canNext} aria-label={booking.a11y.nextMonth} className={navBtn}>
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11.5px] font-medium uppercase tracking-wide text-stone" aria-hidden>
        {weekdayLabels().map((d) => (
          <span key={d} className="truncate px-0.5 py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`pad-${i}`} aria-hidden />;
          const isToday = sameDay(d, today);
          if (!isBookable(d, now, timeZone)) {
            // Unavailable days are shown, but are not buttons or tab stops.
            return (
              <span
                key={d.getTime()}
                aria-hidden
                className={`grid aspect-square place-items-center text-[14.5px] font-medium text-ink/30 ${isToday ? 'underline decoration-ember decoration-2 underline-offset-4' : ''}`}
              >
                {d.getDate()}
              </span>
            );
          }
          const active = !!selected && sameDay(d, selected);
          return (
            <button
              key={d.getTime()}
              type="button"
              aria-pressed={active}
              aria-label={fmt.dayLong(d)}
              onClick={() => onSelect(d)}
              className={`relative grid aspect-square place-items-center rounded-xl text-[14.5px] font-medium transition ${
                active ? 'bg-ink text-cream shadow-[0_8px_18px_-8px_rgb(17_17_17/0.7)]' : 'bg-white text-ink ring-1 ring-ink/20 hover:ring-ink/50'
              } ${isToday && !active ? 'underline decoration-ember decoration-2 underline-offset-4' : ''}`}
            >
              {d.getDate()}
              {!active && <span aria-hidden className="absolute bottom-[5px] size-1 rounded-full bg-ember" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
