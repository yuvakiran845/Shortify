import { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Labelled text input with optional hint and error message.
 * The label, hint, and error are wired up with htmlFor / aria-describedby
 * so screen readers announce them together with the field.
 * - `trailing` renders an element (e.g. a submit button) beside the input on
 *   wider screens and below it on phones.
 * - `endAdornment` renders a small element inside the right edge of the input
 *   (e.g. a "show password" button).
 * In React 19 `ref` is a normal prop, so it reaches the <input> through ...props.
 */
export default function Input({ label, hint, error, trailing, endAdornment, id, className, inputClassName, ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className={cn(trailing && 'flex flex-col gap-3 sm:flex-row')}>
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            className={cn(
              'block h-11 w-full min-w-0 rounded-lg border bg-white px-3.5 text-[15px] text-ink shadow-xs transition-colors',
              'placeholder:text-ink-subtle focus:ring-4 focus:outline-hidden',
              'disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-subtle',
              error
                ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                : 'border-line-strong hover:border-ink/25 focus:border-brand-600 focus:ring-brand-100',
              endAdornment && 'pr-11',
              inputClassName,
            )}
            {...props}
          />
          {endAdornment && <div className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</div>}
        </div>
        {trailing}
      </div>
      {message && (
        <p id={messageId} className={cn('mt-1.5 text-sm', error ? 'text-red-600' : 'text-ink-subtle')}>
          {message}
        </p>
      )}
    </div>
  );
}
