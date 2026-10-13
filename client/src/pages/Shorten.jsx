import { useState } from 'react';
import Container from '../components/layout/Container';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import ShortenForm from '../components/links/ShortenForm';
import ShortLinkResult from '../components/links/ShortLinkResult';
import useAuth from '../hooks/useAuth';
import usePageTitle from '../hooks/usePageTitle';

export default function Shorten() {
  usePageTitle('Shorten a URL');
  const [createdLink, setCreatedLink] = useState(null);
  const { user } = useAuth();

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <div className="text-center">
        <Badge tone="brand">URL shortener</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Shorten a long URL</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink-muted">
          Paste a link to get a short version you can copy and share anywhere.
        </p>
      </div>

      <Card padding="lg" className="mt-10">
        {/* Custom aliases, titles, and expiry dates need an account (the API enforces this too). */}
        <ShortenForm onCreated={setCreatedLink} showOptions={Boolean(user)} />
      </Card>

      {/* aria-live announces the new short link to screen-reader users */}
      <div aria-live="polite" className="mt-6">
        {createdLink && <ShortLinkResult key={createdLink.id} link={createdLink} />}
      </div>
    </Container>
  );
}
