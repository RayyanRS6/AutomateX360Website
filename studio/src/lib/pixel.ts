// Meta Pixel events from the booking form. The pixel itself loads in
// index.html; where it doesn't (localhost), these do nothing.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Kept here, not in a card: the page has two booking cards and a visitor can book again. */
let leadSent = false;

/**
 * Both fire only once the whole form has gone through and the call is booked
 * (never on a step change). `Lead` counts once per page view, whichever card
 * they used and however often they rebook; `Schedule` counts every booking.
 */
export function trackPixel(event: 'Lead' | 'Schedule') {
  if (event === 'Lead') {
    if (leadSent) return;
    leadSent = true;
  }
  try {
    window.fbq?.('track', event);
  } catch {
    // Tracking must never break the booking.
  }
}
