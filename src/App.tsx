import { useEffect } from 'react';
import { cta } from './content';
import { Header } from './components/Header';
import { MobileCtaBar } from './components/MobileCtaBar';
import { Hero } from './sections/Hero';
import { Proof } from './sections/Proof';
import { Offer } from './sections/Offer';
import { WhatYouGet } from './sections/WhatYouGet';
import { Filter } from './sections/Filter';
import { Booking } from './sections/Booking';
import { Faq } from './sections/Faq';
import { FinalCta, Footer } from './sections/FinalCta';
import { goToBooking, initParallax, initReveal, initWatchdog } from './lib/motion';

export default function App() {
  useEffect(() => {
    const stops = [initReveal(), initParallax(), initWatchdog()];
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
        <Proof />
        <Offer />
        <WhatYouGet />
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
