import { useId, useRef, useState } from 'react';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import Switch from '../ui/Switch';
import { AliasField, ExpiryField, TitleField } from './LinkOptionFields';
import { updateLink } from '../../lib/linksApi';
import { buildLinkChanges, toLocalInputValue } from '../../lib/linkForm';
import { formatDateTime, withoutProtocol } from '../../lib/format';
import { toast } from '../../lib/toast';

const FIELDS = ['url', 'title', 'alias', 'expiresAt', 'isActive'];

const initialForm = (link) => ({
  url: link.originalUrl,
  title: link.title ?? '',
  alias: link.shortCode,
  hasExpiry: Boolean(link.expiresAt),
  expiresAt: link.expiresAt ? toLocalInputValue(link.expiresAt) : '',
  isActive: link.isActive,
});

/**
 * Edit dialog for one link. `link` is the link being edited, or null when closed.
 * The form lives in a child keyed by the link, so every opening starts fresh.
 */
export default function EditLinkDialog({ link, onClose, onSaved, onGone }) {
  const formId = useId();
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={Boolean(link)}
      onClose={() => !saving && onClose()}
      title="Edit link"
      description={link ? withoutProtocol(link.shortUrl) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      {link && (
        <EditLinkForm
          key={link.id}
          id={formId}
          link={link}
          onSavingChange={setSaving}
          onSaved={onSaved}
          onGone={onGone}
          onNoChanges={onClose}
        />
      )}
    </Dialog>
  );
}

function EditLinkForm({ id, link, onSavingChange, onSaved, onGone, onNoChanges }) {
  const [form, setForm] = useState(() => initialForm(link));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const baseUrl = link.shortUrl.slice(0, -link.shortCode.length);
  const aliasChanged = form.alias.trim() !== link.shortCode;
  const expiredNow = link.status === 'expired';

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const showErrors = (fieldErrors) => {
    setErrors(fieldErrors);
    const first = FIELDS.find((field) => fieldErrors[field]);
    formRef.current?.elements.namedItem(first)?.focus();
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const { changes, errors: fieldErrors } = buildLinkChanges(link, form);
    if (Object.keys(fieldErrors).length > 0) {
      showErrors(fieldErrors);
      return;
    }
    if (Object.keys(changes).length === 0) {
      onNoChanges();
      return;
    }

    setSubmitting(true);
    onSavingChange(true);
    try {
      const saved = await updateLink(link.id, changes);
      toast.success(changes.alias ? `Saved. The new short link is ${withoutProtocol(saved.shortUrl)}.` : 'Link updated.');
      onSaved(saved);
    } catch (error) {
      if (error.status === 404) {
        toast.error('This link no longer exists. It may have been deleted in another tab.');
        onGone();
      } else if (FIELDS.includes(error.field)) {
        showErrors({ [error.field]: error.message });
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
      onSavingChange(false);
    }
  }

  return (
    <form id={id} ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      <Input
        data-autofocus
        label="Destination URL"
        name="url"
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={form.url}
        onChange={(event) => update('url', event.target.value)}
        error={errors.url}
        hint="Where the short link sends visitors. Existing QR codes keep working."
      />

      <TitleField value={form.title} onChange={(value) => update('title', value)} error={errors.title} />

      <div className="space-y-3">
        <AliasField
          required
          value={form.alias}
          onChange={(value) => update('alias', value)}
          error={errors.alias}
          baseUrl={baseUrl}
        />
        {aliasChanged && !errors.alias && (
          <Alert tone="warning" title="The old short link will stop working">
            {withoutProtocol(link.shortUrl)} will show a &ldquo;not found&rdquo; page, including on QR codes you have
            already printed or shared. Your QR history is updated to the new link. The old alias stays reserved for
            this link, so nobody else can take it, and you can switch back later.
          </Alert>
        )}
      </div>

      <div className="rounded-lg border border-line p-4">
        <Switch
          name="isActive"
          label="Active"
          description={
            form.isActive
              ? 'On: visitors are redirected to the destination.'
              : 'Off: visitors see a "link turned off" page. Clicks and QR codes are kept.'
          }
          checked={form.isActive}
          onChange={(value) => update('isActive', value)}
        />
        {errors.isActive && <p className="mt-2 text-sm text-red-600">{errors.isActive}</p>}
      </div>

      <div>
        <ExpiryField
          enabled={form.hasExpiry}
          onEnabledChange={(value) => update('hasExpiry', value)}
          value={form.expiresAt}
          onValueChange={(value) => update('expiresAt', value)}
          error={errors.expiresAt}
        />
        {expiredNow && (
          <p className="mt-2 text-sm text-ink-muted">
            This link expired on {formatDateTime(link.expiresAt)}. Pick a later date or remove the expiration to
            turn it back on.
          </p>
        )}
      </div>
    </form>
  );
}
