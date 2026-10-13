// Meta Pixel events from the booking form. The pixel itself loads in
// index.html; where it doesn't (localhost), these do nothing.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Set once Lead has fired, shared by both booking cards on the page. */
let leadSent = false;

/**
 * Both fire only once a booking has gone through: the whole form, time and
 * details, sent and accepted. `Lead` counts once per page view, even with two
 * booking cards or a second booking after "Book a different time".
 * `Schedule` fires for every booking.
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
