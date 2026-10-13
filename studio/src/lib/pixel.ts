// Meta Pixel events from the booking form. The pixel itself loads in
// index.html; where it doesn't (localhost), these do nothing.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** `Lead`: name, email and phone submitted (step 1). `Schedule`: the call is booked. */
export function trackPixel(event: 'Lead' | 'Schedule') {
  try {
    window.fbq?.('track', event);
  } catch {
    // Tracking must never break the booking.
  }
}
