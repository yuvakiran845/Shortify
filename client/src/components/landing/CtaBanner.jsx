import { Link2 } from 'lucide-react';
import Container from '../layout/Container';
import Button from '../ui/Button';
import { ROUTES } from '../../lib/routes';

export default function CtaBanner() {
  return (
    <section aria-labelledby="cta-title" className="py-20 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-600 px-6 py-14 text-center shadow-brand sm:px-12 sm:py-16">
          {/* Decorative: faint dot grid and a lighter glow, both in the brand colour */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:20px_20px]"
          />
          <div
            aria-hidden="true"
            className="absolute -top-32 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-brand-400/40 blur-3xl"
          />
          <h2 id="cta-title" className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl">
            Ready to share smarter?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-brand-50">
            Create a short link or a QR code in seconds, then keep every link organized in one place.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to={ROUTES.shorten} variant="light" size="lg">
              <Link2 className="size-5" aria-hidden="true" />
              Shorten a URL
            </Button>
            <Button to={ROUTES.signup} variant="outline-light" size="lg">
              Create a free account
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
