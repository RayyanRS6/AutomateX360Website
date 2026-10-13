import { useEffect } from 'react';
import { cta } from './content';
import { Header } from './components/Header';
import { MobileCtaBar } from './components/MobileCtaBar';
import { Hero } from './sections/Hero';
import { Problem } from './sections/Problem';
import { Included } from './sections/Included';
import { Night } from './sections/Night';
import { Pricing } from './sections/Pricing';
import { Proof } from './sections/Proof';
import { Filter } from './sections/Filter';
import { Booking } from './sections/Booking';
import { Faq } from './sections/Faq';
import { FinalCta, Footer } from './sections/FinalCta';
import { goToBooking, initReveal, initWatchdog } from './lib/motion';

export default function App() {
  useEffect(() => {
    const stops = [initReveal(), initWatchdog()];
    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <>
      <a href="#book" className="skip-link" onClick={goToBooking}>
        {cta.skipLink}
      </a>
      <Header />
      <main>
        <Hero />
        <Problem />
        <Included />
        <Night />
        <Pricing />
        <Proof />
        <Filter />
        <Booking />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <MobileCtaBar />
    </>
  );
}
