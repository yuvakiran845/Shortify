import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

// Friendly placeholder for "nothing here yet" screens, with an optional action.
export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
