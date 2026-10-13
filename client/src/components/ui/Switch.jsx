import { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * On/off switch. A <button role="switch"> with aria-checked is the standard
 * accessible pattern: screen readers announce "switch, on/off", and Space/Enter toggle it.
 */
export default function Switch({ checked, onChange, label, description, name, className }) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-ink-subtle">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        name={name}
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-line-strong',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow-xs transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
