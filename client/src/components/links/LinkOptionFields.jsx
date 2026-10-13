import { useId } from 'react';
import Input from '../ui/Input';
import { ALIAS_MAX_LENGTH, ALIAS_MIN_LENGTH, defaultExpiryInput, TITLE_MAX_LENGTH, toLocalInputValue } from '../../lib/linkForm';
import { withoutProtocol } from '../../lib/format';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Custom alias with a live preview of the resulting short URL.
// baseUrl: "http://localhost:5000/" (may be null while the app config loads).
export function AliasField({ value, onChange, error, baseUrl, required = false, ...props }) {
  const alias = value.trim();
  const preview = baseUrl && alias ? `${withoutProtocol(baseUrl)}${alias}` : null;
  const rules = `Letters, numbers, - and _, ${ALIAS_MIN_LENGTH}-${ALIAS_MAX_LENGTH} characters.`;
  return (
    <Input
      label={required ? 'Alias' : 'Custom alias (optional)'}
      name="alias"
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={ALIAS_MAX_LENGTH + 10}
      placeholder="spring-sale"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      hint={preview ? `Short link: ${preview}` : required ? rules : `Leave empty for a random code. ${rules}`}
      {...props}
    />
  );
}

export function TitleField({ value, onChange, error }) {
  return (
    <Input
      label="Title (optional)"
      name="title"
      autoComplete="off"
      maxLength={TITLE_MAX_LENGTH + 10}
      placeholder="Spring sale landing page"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      hint="A name to help you find this link. Only you can see it."
    />
  );
}

/**
 * "Expire this link" checkbox plus a local date-time picker.
 * enabled / onEnabledChange: the checkbox. value / onValueChange: "2026-10-20T09:30" in local time.
 */
export function ExpiryField({ enabled, onEnabledChange, value, onValueChange, error }) {
  const checkboxId = useId();
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <input
          id={checkboxId}
          type="checkbox"
          name="hasExpiry"
          checked={enabled}
          onChange={(event) => {
            onEnabledChange(event.target.checked);
            if (event.target.checked && !value) onValueChange(defaultExpiryInput());
          }}
          className="size-4 rounded border-line-strong accent-brand-600"
        />
        <label htmlFor={checkboxId} className="text-sm font-medium text-ink">
          Expire this link on a date
        </label>
      </div>
      {enabled && (
        <Input
          className="mt-3"
          label="Expires at"
          name="expiresAt"
          type="datetime-local"
          min={toLocalInputValue(new Date())}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          error={error}
          hint={`Your time zone (${TIME_ZONE}). After this time, visitors see a "link expired" page.`}
        />
      )}
    </div>
  );
}
