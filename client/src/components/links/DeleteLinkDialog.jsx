import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import { deleteLink } from '../../lib/linksApi';
import { formatNumber, withoutProtocol } from '../../lib/format';
import { toast } from '../../lib/toast';

/**
 * Confirmation before deleting a link. `link` is the link to delete, or null when closed.
 * It spells out exactly what is removed, because deleting cannot be undone.
 * Focus starts on "Cancel" so pressing Enter by accident never deletes anything.
 */
export default function DeleteLinkDialog({ link, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const name = link ? withoutProtocol(link.shortUrl) : '';

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLink(link.id);
      toast.success(`Deleted ${name}.`);
      onDeleted(link);
    } catch (error) {
      if (error.status === 404) {
        // Already gone (e.g. deleted in another tab): the end result is the same.
        toast.info('That link was already deleted.');
        onDeleted(link);
      } else {
        toast.error(error.message);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={Boolean(link)}
      onClose={() => !deleting && onClose()}
      title="Delete this link?"
      description={name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleting} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            {!deleting && <Trash2 className="size-4" aria-hidden="true" />}
            {deleting ? 'Deleting…' : 'Delete link'}
          </Button>
        </>
      }
    >
      {link && (
        <div className="space-y-4 text-sm text-ink-muted">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              The short link stops working right away. Visitors, including anyone scanning a printed QR code, will see
              a &ldquo;link deleted&rdquo; page.
            </li>
            <li>
              Its click history ({formatNumber(link.clickCount)} {link.clickCount === 1 ? 'click' : 'clicks'}) is
              removed from your analytics.
            </li>
            <li>QR codes made for this link are removed from your QR history.</li>
            <li>
              The alias <span className="font-medium text-ink">{link.shortCode}</span> can never be used again, so
              old shares can never point somewhere new.
            </li>
          </ul>
          <p className="font-medium text-ink">This cannot be undone.</p>
          <p>Want to pause it instead? Use Edit and switch the link off; clicks and QR codes are kept.</p>
        </div>
      )}
    </Dialog>
  );
}
