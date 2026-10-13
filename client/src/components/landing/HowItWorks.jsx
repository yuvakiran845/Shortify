import { ClipboardPaste, Share2, SlidersHorizontal } from 'lucide-react';
import Container from '../layout/Container';
import SectionHeading from './SectionHeading';

const STEPS = [
  {
    icon: ClipboardPaste,
    title: 'Paste your long URL',
    description: 'Drop in any web address: a product page, a sign-up form, a document, or a video.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Customize and create',
    description: 'Add an optional custom alias or expiration date, then create your short link.',
  },
  {
    icon: Share2,
    title: 'Share and track',
    description: 'Copy the link or download its QR code, then follow the clicks from your dashboard.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-16 py-20 sm:py-24">
      <Container>
        <SectionHeading
          id="how-it-works-title"
          eyebrow="How it works"
          title="From long link to shared link in three steps"
        />

        {/* The ::before line connects the three step icons on wider screens */}
        <ol className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8 md:before:absolute md:before:top-6 md:before:right-[16.67%] md:before:left-[16.67%] md:before:h-px md:before:bg-line-strong">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="relative flex flex-col items-center text-center">
              <span className="grid size-12 place-items-center rounded-full border border-line bg-white text-brand-600 shadow-card">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-4 text-xs font-semibold tracking-wide text-coral-600 uppercase">Step {index + 1}</span>
              <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">{description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
