import { Check, Link2, QrCode } from 'lucide-react';
import Container from '../layout/Container';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import HeroIllustration from './HeroIllustration';
import { ROUTES } from '../../lib/routes';

const HIGHLIGHTS = ['Custom aliases', 'PNG QR downloads', 'Click analytics'];

export default function Hero() {
  return (
    <section>
      {/* grid-cols-1 = minmax(0, 1fr): stops long, non-wrapping text from widening the column on phones */}
      <Container className="grid grid-cols-1 items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-24">
        <div className="max-w-xl">
          <Badge tone="brand">
            <span className="size-1.5 rounded-full bg-coral-500" aria-hidden="true" />
            URL shortener + QR code generator
          </Badge>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Shorten links.
            <br />
            <span className="text-brand-600">Share smarter.</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-pretty text-ink-muted">
            Turn long, messy URLs into clean short links, create QR codes you can download in seconds, and see how
            every link performs, all from one simple workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to={ROUTES.shorten} size="lg">
              <Link2 className="size-5" aria-hidden="true" />
              Shorten a URL
            </Button>
            <Button to={ROUTES.qr} size="lg" variant="secondary">
              <QrCode className="size-5" aria-hidden="true" />
              Generate QR Code
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroIllustration />
      </Container>
    </section>
  );
}
