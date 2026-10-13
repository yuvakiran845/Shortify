import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

// Labelled native <select> styled like <Input>. Native selects keep full
// keyboard, screen-reader, and mobile picker support for free.
export default function Select({ label, options, id, className, ...props }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className="block h-11 w-full cursor-pointer appearance-none rounded-lg border border-line-strong bg-white pr-10 pl-3.5 text-[15px] text-ink shadow-xs transition-colors hover:border-ink/25 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-hidden"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
