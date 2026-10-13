import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Faq from '../components/landing/Faq';
import CtaBanner from '../components/landing/CtaBanner';
import usePageTitle from '../hooks/usePageTitle';

export default function Landing() {
  usePageTitle();

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Faq />
      <CtaBanner />
    </>
  );
}
