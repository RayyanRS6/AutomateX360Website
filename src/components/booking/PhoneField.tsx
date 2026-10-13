import { ChevronDown } from 'lucide-react';
import { booking } from '../../content';
import { COUNTRIES, flag } from '../../lib/countries';

type Props = {
  country: string;
  onCountry: (iso: string) => void;
  value: string;
  onValue: (v: string) => void;
};

/**
 * Phone number with a country code picker. The picker is a real native
 * <select> laid over a short "🇦🇪 +971" label, so phones open their own
 * scrollable list, and nothing heavy loads on the page.
 */
export function PhoneField({ country, onCountry, value, onValue }: Props) {
  const current = COUNTRIES.find((c) => c.iso === country) ?? COUNTRIES[0];
  return (
    <div>
      <label htmlFor="f-phone" className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px] font-semibold">
        {booking.fields.phone}
        <span className="text-[12px] font-normal text-stone">{booking.fields.optional}</span>
      </label>
      <div className="flex gap-2">
        {/* The select is invisible, so the wrapper shows its keyboard focus. */}
        <div className="relative shrink-0 rounded-[14px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ember has-[:focus-visible]:ring-offset-2">
          <span aria-hidden className="field pointer-events-none flex w-auto items-center gap-1.5 pr-8 tabular-nums">
            <span>{flag(current.iso)}</span>
            <span>+{current.dial}</span>
          </span>
          <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50" />
          <select
            value={current.iso}
            onChange={(e) => onCountry(e.target.value)}
            aria-label={booking.fields.phoneCountry}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {COUNTRIES.map((c) => (
              <option key={c.iso} value={c.iso}>
                {`${c.name} (+${c.dial})`}
              </option>
            ))}
          </select>
        </div>
        <input
          id="f-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={20}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-describedby="f-phone-hint"
          className="field min-w-0 flex-1"
        />
      </div>
      <p id="f-phone-hint" className="mt-1.5 text-[12.5px] text-stone">
        {booking.fields.phoneHint}
      </p>
    </div>
  );
}
