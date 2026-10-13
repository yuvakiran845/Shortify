import { ChartColumn, FolderSearch, Link2, PenLine, QrCode, ShieldCheck } from 'lucide-react';
import Container from '../layout/Container';
import Card from '../ui/Card';
import SectionHeading from './SectionHeading';

const FEATURES = [
  {
    icon: Link2,
    title: 'Instant short links',
    description: 'Paste any http or https address and get a short, shareable link in one click.',
  },
  {
    icon: QrCode,
    title: 'Downloadable QR codes',
    description: 'Create a scannable QR code for any link and download it as a PNG for print, packaging, or slides.',
  },
  {
    icon: PenLine,
    title: 'Custom aliases',
    description: 'Pick a readable ending like /spring-sale so people know where a link goes before they tap it.',
  },
  {
    icon: ChartColumn,
    title: 'Click analytics',
    description: 'See total clicks, activity over time, and which of your links perform best.',
  },
  {
    icon: FolderSearch,
    title: 'Organized link library',
    description: 'Search, sort, and filter every link you have created from a single page.',
  },
  {
    icon: ShieldCheck,
    title: 'You stay in control',
    description: 'Links belong to your account. Add an expiration date or switch a link off whenever you need to.',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-16 border-y border-line bg-surface py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything you need to share links"
          description="Shortify keeps the essentials simple: create a link, make it yours, share it anywhere, and measure what happens next."
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full transition-shadow hover:shadow-raised">
                <span className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
