import { useId, useRef, useState } from 'react';
import { ChevronDown, Link2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AliasField, ExpiryField, TitleField } from './LinkOptionFields';
import useAppConfig from '../../hooks/useAppConfig';
import { createLink } from '../../lib/linksApi';
import { aliasError, expiryError, fromLocalInputValue, titleError } from '../../lib/linkForm';
import { cn } from '../../lib/cn';
import { toast } from '../../lib/toast';
import { validateUrl } from '../../lib/validateUrl';

const EMPTY_OPTIONS = { alias: '', title: '', hasExpiry: false, expiresAt: '' };
const OPTION_FIELDS = ['alias', 'title', 'expiresAt'];

// Checks the optional fields; returns { errors, options } where options is what the API gets.
function readOptions({ alias, title, hasExpiry, expiresAt }) {
  const errors = {};
  const options = {};
  if (aliasError(alias)) errors.alias = aliasError(alias);
  else if (alias.trim()) options.alias = alias.trim();
  if (titleError(title)) errors.title = titleError(title);
  else if (title.trim()) options.title = title.trim();
  if (hasExpiry) {
    if (expiryError(expiresAt)) errors.expiresAt = expiryError(expiresAt);
    else options.expiresAt = fromLocalInputValue(expiresAt);
  }
  return { errors, options };
}

/**
 * Form with one URL field. Calls onCreated(link) after the API saves the link.
 * autoFocus: inside a <Dialog>, the URL field gets focus when the dialog opens.
 * showOptions: signed-in users get "More options" (custom alias, title, expiry).
 */
export default function ShortenForm({ onCreated, autoFocus = false, showOptions = false }) {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const optionsId = useId();
  const config = useAppConfig();
  const baseUrl = config?.shortLinkBaseUrl ? `${config.shortLinkBaseUrl}/` : null;

  const showErrors = (fieldErrors) => {
    setErrors(fieldErrors);
    if (OPTION_FIELDS.some((field) => fieldErrors[field])) setOptionsOpen(true);
    const first = ['url', ...OPTION_FIELDS].find((field) => fieldErrors[field]);
    // Wait one frame so a just-opened options panel exists before focusing inside it.
    requestAnimationFrame(() => formRef.current?.elements.namedItem(first)?.focus());
  };

  const updateOption = (field, value) => {
    setOptions((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = {};
    const result = validateUrl(url);
    if (!result.ok) fieldErrors.url = result.message;
    const extra = showOptions ? readOptions(options) : { errors: {}, options: {} };
    Object.assign(fieldErrors, extra.errors);
    if (Object.keys(fieldErrors).length > 0) {
      showErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const link = await createLink(url.trim(), extra.options);
      setUrl('');
      setOptions(EMPTY_OPTIONS);
      onCreated(link);
      toast.success('Short link created.');
    } catch (requestError) {
      if (['url', ...OPTION_FIELDS].includes(requestError.field)) {
        showErrors({ [requestError.field]: requestError.message });
      } else {
        toast.error(requestError.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Input
        data-autofocus={autoFocus || undefined}
        label="Long URL"
        name="url"
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="https://example.com/a/very/long/link"
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
          if (errors.url) setErrors((current) => ({ ...current, url: undefined }));
        }}
        error={errors.url}
        hint="Paste any http or https link. You can leave out the https:// part."
        inputClassName="h-12 text-base"
        trailing={
          <Button type="submit" size="lg" loading={submitting} className="sm:w-44">
            {!submitting && <Link2 className="size-5" aria-hidden="true" />}
            {submitting ? 'Shortening…' : 'Shorten URL'}
          </Button>
        }
      />

      {showOptions && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={optionsOpen}
            aria-controls={optionsId}
            onClick={() => setOptionsOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <ChevronDown
              className={cn('size-4 transition-transform', optionsOpen && 'rotate-180')}
              aria-hidden="true"
            />
            More options
            <span className="font-normal text-ink-subtle">(custom alias, title, expiration)</span>
          </button>
          {optionsOpen && (
            <div id={optionsId} className="mt-4 space-y-4 rounded-lg border border-line bg-surface p-4">
              <AliasField
                value={options.alias}
                onChange={(value) => updateOption('alias', value)}
                error={errors.alias}
                baseUrl={baseUrl}
              />
              <TitleField value={options.title} onChange={(value) => updateOption('title', value)} error={errors.title} />
              <ExpiryField
                enabled={options.hasExpiry}
                onEnabledChange={(value) => updateOption('hasExpiry', value)}
                value={options.expiresAt}
                onValueChange={(value) => updateOption('expiresAt', value)}
                error={errors.expiresAt}
              />
            </div>
          )}
        </div>
      )}
    </form>
  );
}
