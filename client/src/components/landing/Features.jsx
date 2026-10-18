import { FolderSearch, Link2, MousePointerClick, PenLine, QrCode, ShieldCheck } from 'lucide-react';
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
    icon: MousePointerClick,
    title: 'Real click counts',
    description: 'See how many people opened each link. Bots, link previews, and repeat clicks are not counted.',
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
          description="Shortify keeps the essentials simple: create a link, make it yours, share it anywhere, and see how often it is opened."
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-raised">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
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
