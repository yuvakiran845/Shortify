import { Link2 } from 'lucide-react';
import Container from '../layout/Container';
import Button from '../ui/Button';
import { ROUTES } from '../../lib/routes';

export default function CtaBanner() {
  return (
    <section aria-labelledby="cta-title" className="py-20 sm:py-24">
      <Container>
        <div className="rounded-2xl bg-brand-600 px-6 py-12 text-center sm:px-12 sm:py-14">
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
