import { ArrowLeft, Compass } from 'lucide-react';
import Container from '../components/layout/Container';
import Button from '../components/ui/Button';
import usePageTitle from '../hooks/usePageTitle';
import { ROUTES } from '../lib/routes';

export default function NotFound() {
  usePageTitle('Page not found');

  return (
    <Container size="narrow" className="flex flex-col items-center py-24 text-center sm:py-32">
      <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-600">404 error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-base leading-7 text-ink-muted">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Button to={ROUTES.home} className="mt-8">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to home
      </Button>
    </Container>
  );
}
