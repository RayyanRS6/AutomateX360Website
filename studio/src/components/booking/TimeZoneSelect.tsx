import { useLayoutEffect, useMemo, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { booking } from '../../content';
import { zoneOptions } from '../../lib/timezones';

type Props = {
  /** The select's id; its hint takes `${id}-hint`. */
  id: string;
  value: string;
  deviceZone: string;
  onChange: (tz: string) => void;
};

/**
 * A plain native <select>: light, and on phones it opens the system picker,
 * which is easier to scroll than any custom dropdown.
 */
export function TimeZoneSelect({ id, value, deviceZone, onChange }: Props) {
  // The hero's card opens on this step, so the picker is in the prerendered
  // page. GMT offsets shift with daylight saving and there they'd be the
  // build day's, so that page lists names only; the offsets go in as soon as
  // the script runs (opened later by a click, the picker never shows without them).
  const [live, setLive] = useState(false);
  useLayoutEffect(() => setLive(true), []);
  const groups = useMemo(() => zoneOptions(deviceZone, live ? new Date() : null), [deviceZone, live]);

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {booking.timeZoneLabel}
      </label>
      <div className="relative mt-1.5">
        <Globe size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
          className="field h-11 cursor-pointer appearance-none truncate pl-10 pr-9"
        >
          {groups.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.zones.map((z) => (
                <option key={z.tz} value={z.tz}>
                  {z.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden />
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-stone">
        {booking.timeZoneHint}
      </p>
    </div>
  );
}
