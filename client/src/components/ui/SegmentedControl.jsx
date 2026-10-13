import { cn } from '../../lib/cn';

/**
 * A row of mutually exclusive options that looks like tabs but is built from
 * real radio buttons, so arrow keys, Tab, and screen readers work as expected.
 * options: [{ value, label, icon? }]
 */
export default function SegmentedControl({ legend, name, options, value, onChange, className }) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-2 p-1">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors',
                // The radio input is visually hidden, so show its keyboard focus on the label.
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
                selected ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
