import { cn } from '../../lib/cn';

// Color choice for the QR code, as radio buttons with color swatches.
export default function ColorPicker({ legend, name, colors, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const selected = color.value === value;
          return (
            <label
              key={color.value}
              className={cn(
                'flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
                selected ? 'border-brand-600 bg-brand-50 text-ink' : 'border-line-strong text-ink-muted hover:border-ink/25',
              )}
            >
              <input
                type="radio"
                name={name}
                value={color.value}
                checked={selected}
                onChange={() => onChange(color.value)}
                className="sr-only"
              />
              <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color.value }} />
              {color.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
