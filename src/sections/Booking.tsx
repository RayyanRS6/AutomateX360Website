import { booking } from '../content';
import { Eyebrow, SplitHeading, vars } from '../components/ui';
import { BookingWidget } from '../components/booking/BookingWidget';

export function Booking() {
  return (
    <section
      id="book"
      aria-labelledby="book-h"
      data-cta-zone
      className="cv-auto relative isolate overflow-clip pb-24 pt-14 md:pb-32 md:pt-16"
      style={vars({ '--cis-m': '1135px', '--cis-d': '660px' })}
    >
      <div aria-hidden className="glow-booking pointer-events-none absolute inset-0 -z-10" />

      {/* minmax(0,1fr) and min-w-0 stop the card's buttons from widening the
          single phone column past the screen edge. */}
      <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-y-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:pt-4">
          <Eyebrow className="reveal">{booking.eyebrow}</Eyebrow>
          <SplitHeading id="book-h" plain={booking.heading.plain} em={booking.heading.em} emBlock className="reveal mt-5 text-h2" />
          {booking.line && (
            <p className="reveal mt-6 max-w-md text-[17px] leading-relaxed text-stone sm:text-lg" style={vars({ '--d': '80ms' })}>
              {booking.line}
            </p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <BookingWidget />
        </div>

        <ol className="grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:grid-cols-1 lg:self-start">
          {booking.expect.map((x, i) => (
            <li key={x.title} className="reveal flex gap-4" style={vars({ '--d': `${i * 70}ms` })}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/15 bg-white/60 text-[13px] font-semibold">{i + 1}</span>
              <span>
                <span className="block text-[16px] font-semibold leading-snug">{x.title}</span>
                <span className="mt-0.5 block text-pretty text-[14.5px] leading-relaxed text-stone">{x.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
