import { Link } from 'react-router';
import { ArrowRight, CircleCheck, QrCode } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CopyButton from './CopyButton';
import useAuth from '../../hooks/useAuth';
import { withoutProtocol } from '../../lib/format';
import { qrPathForLink, ROUTES } from '../../lib/routes';

// Shows a freshly created short link with a copy button.
export default function ShortLinkResult({ link }) {
  const { status } = useAuth();

  return (
    <Card className="border-brand-200">
      <p className="flex items-center gap-2 text-sm font-medium text-green-700">
        <CircleCheck className="size-4" aria-hidden="true" />
        Your short link is ready
      </p>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 sm:flex-row sm:items-center sm:pl-4">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-lg font-semibold text-brand-700 hover:underline"
        >
          {withoutProtocol(link.shortUrl)}
        </a>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CopyButton text={link.shortUrl} variant="primary" size="md" className="sm:w-32" />
          <Button to={qrPathForLink(link, { byId: status === 'authenticated' })} variant="secondary">
            <QrCode className="size-4" aria-hidden="true" />
            QR code
          </Button>
        </div>
      </div>

      <dl className="mt-4 text-sm">
        <dt className="text-ink-subtle">Original URL</dt>
        <dd className="mt-0.5 truncate text-ink-muted" title={link.originalUrl}>
          {link.originalUrl}
        </dd>
      </dl>

      {status === 'authenticated' ? (
        <Link
          to={ROUTES.links}
          className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-brand-700 hover:underline"
        >
          View all my links
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            Create a free account to see clicks and manage this link later. It will move into your account automatically.
          </p>
          <Button to={ROUTES.signup} variant="secondary" size="sm" className="shrink-0">
            Sign up
          </Button>
        </div>
      )}
    </Card>
  );
}
