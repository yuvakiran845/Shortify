import { useState } from 'react';
import { Check } from 'lucide-react';
import Container from '../layout/Container';
import Badge from '../ui/Badge';
import ShortenForm from '../links/ShortenForm';
import ShortLinkResult from '../links/ShortLinkResult';
import HeroIllustration from './HeroIllustration';
import useAuth from '../../hooks/useAuth';

const HIGHLIGHTS = ['Free to use', 'Custom aliases', 'QR codes as PNG'];

export default function Hero() {
  const { user } = useAuth();
  const [createdLink, setCreatedLink] = useState(null);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Decorative background: a soft brand-coloured glow and a faint dot grid that fades out */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(64rem_32rem_at_80%_-12%,var(--color-brand-100),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
      />

      {/* grid-cols-1 = minmax(0, 1fr): stops long, non-wrapping text from widening the column on phones */}
      <Container className="grid grid-cols-1 items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
        <div className="max-w-xl">
          <Badge tone="brand">
            <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            URL shortener + QR code generator
          </Badge>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Shorten links.
            <br />
            <span className="text-brand-600">Share smarter.</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-pretty text-ink-muted">
            Turn long, messy URLs into clean short links and QR codes you can share anywhere. Paste a link below to
            try it, no account needed.
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-raised sm:p-5">
            <ShortenForm onCreated={setCreatedLink} showOptions={Boolean(user)} />
          </div>

          {/* aria-live announces the new short link to screen-reader users */}
          <div aria-live="polite">
            {createdLink && (
              <div className="mt-4">
                <ShortLinkResult key={createdLink.id} link={createdLink} />
              </div>
            )}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand-600" aria-hidden="true" />
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
