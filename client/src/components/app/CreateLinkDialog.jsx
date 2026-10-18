import { useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck, QrCode } from 'lucide-react';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import CopyButton from '../links/CopyButton';
import ShortenForm from '../links/ShortenForm';
import { withoutProtocol } from '../../lib/format';
import { qrPathForLink, ROUTES } from '../../lib/routes';

/**
 * "Create link" dialog, available from every page of the signed-in app.
 * After a link is created it stays open, showing the result, so the user can
 * copy it or create another one.
 */
export default function CreateLinkDialog({ open, onClose, onCreated }) {
  const [created, setCreated] = useState(null);
  // Changing the key gives the form fresh state (empty input, no errors).
  const [formKey, setFormKey] = useState(0);

  const handleClose = () => {
    onClose();
    setCreated(null);
    setFormKey((key) => key + 1);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create a short link"
      description="Paste a long URL to get a short link you can share. Add a custom alias or expiry under More options."
      footer={
        <Button variant="secondary" onClick={handleClose}>
          {created ? 'Done' : 'Cancel'}
        </Button>
      }
    >
      <ShortenForm
        key={formKey}
        autoFocus
        showOptions
        onCreated={(link) => {
          setCreated(link);
          onCreated(link);
        }}
      />

      <div aria-live="polite">
        {created && (
          <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CircleCheck className="size-4" aria-hidden="true" />
              Link created
            </p>
            <a
              href={created.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate text-lg font-semibold text-brand-700 hover:underline"
            >
              {withoutProtocol(created.shortUrl)}
            </a>
            <p className="mt-0.5 truncate text-sm text-ink-subtle" title={created.originalUrl}>
              {created.originalUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={created.shortUrl} variant="primary" />
              <Button variant="secondary" size="sm" to={qrPathForLink(created)} onClick={handleClose}>
                <QrCode className="size-4" aria-hidden="true" />
                QR code
              </Button>
            </div>
          </div>
        )}
      </div>

      {created && (
        <p className="mt-4 text-sm text-ink-muted">
          You can also see all your links on the{' '}
          <Link to={ROUTES.links} onClick={handleClose} className="font-semibold text-brand-700 hover:underline">
            My links
          </Link>{' '}
          page.
        </p>
      )}
    </Dialog>
  );
}
