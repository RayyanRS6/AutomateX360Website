// Time zones offered in the booking card's picker, grouped by region. The
// visitor's own zone (from their device) is added at the top if it isn't
// listed here, so nobody is ever missing.

import { zoneCity, zoneOffset } from './booking';

const GROUPS: { region: string; zones: string[] }[] = [
  {
    region: 'Americas',
    zones: [
      'Pacific/Honolulu',
      'America/Anchorage',
      'America/Los_Angeles',
      'America/Vancouver',
      'America/Phoenix',
      'America/Denver',
      'America/Chicago',
      'America/Mexico_City',
      'America/New_York',
      'America/Toronto',
      'America/Bogota',
      'America/Lima',
      'America/Caracas',
      'America/Halifax',
      'America/Puerto_Rico',
      'America/Santiago',
      'America/St_Johns',
      'America/Sao_Paulo',
      'America/Argentina/Buenos_Aires',
    ],
  },
  {
    region: 'Europe',
    zones: [
      'Europe/London',
      'Europe/Dublin',
      'Europe/Lisbon',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Stockholm',
      'Europe/Warsaw',
      'Europe/Athens',
      'Europe/Istanbul',
      'Europe/Moscow',
    ],
  },
  {
    region: 'Middle East & Africa',
    zones: [
      'Africa/Casablanca',
      'Africa/Lagos',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Nairobi',
      'Asia/Jerusalem',
      'Asia/Riyadh',
      'Asia/Kuwait',
      'Asia/Bahrain',
      'Asia/Qatar',
      'Asia/Tehran',
      'Asia/Dubai',
      'Asia/Muscat',
    ],
  },
  {
    region: 'Asia',
    zones: [
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Colombo',
      'Asia/Kathmandu',
      'Asia/Dhaka',
      'Asia/Bangkok',
      'Asia/Jakarta',
      'Asia/Singapore',
      'Asia/Kuala_Lumpur',
      'Asia/Manila',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Taipei',
      'Asia/Seoul',
      'Asia/Tokyo',
    ],
  },
  {
    region: 'Australia & Pacific',
    zones: ['Australia/Perth', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'],
  },
];

/** Short, familiar names (they must fit a phone-width picker). */
const NAMES: Record<string, string> = {
  'America/New_York': 'Eastern Time (US)',
  'America/Chicago': 'Central Time (US)',
  'America/Denver': 'Mountain Time (US)',
  'America/Phoenix': 'Arizona',
  'America/Los_Angeles': 'Pacific Time (US)',
  'America/Anchorage': 'Alaska',
  'Pacific/Honolulu': 'Hawaii',
  'America/St_Johns': 'Newfoundland',
  'Asia/Karachi': 'Pakistan (Islamabad)',
  'Asia/Kolkata': 'India',
  'Asia/Qatar': 'Qatar (Doha)',
  'Asia/Dubai': 'Dubai, Abu Dhabi',
  'Asia/Riyadh': 'Riyadh, Jeddah',
  'Asia/Shanghai': 'China',
};
export type ZoneOption = { tz: string; label: string };

export function zoneLabel(tz: string, at = new Date()) {
  const offset = zoneOffset(tz, at);
  return `${NAMES[tz] ?? zoneCity(tz)}${offset ? ` · ${offset}` : ''}`;
}

/** The picker's options, with the visitor's own zone first if it isn't listed. */
export function zoneOptions(deviceZone: string, at = new Date()) {
  const listed = new Set(GROUPS.flatMap((g) => g.zones));
  const groups = GROUPS.map((g) => ({ region: g.region, zones: g.zones.map((tz) => ({ tz, label: zoneLabel(tz, at) })) }));
  if (!listed.has(deviceZone)) groups.unshift({ region: 'Your device', zones: [{ tz: deviceZone, label: zoneLabel(deviceZone, at) }] });
  return groups;
}
