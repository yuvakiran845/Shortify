import { useSyncExternalStore } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { dismissToast, getToasts, subscribe } from '../../lib/toast';
import { cn } from '../../lib/cn';

const TYPES = {
  success: { Icon: CircleCheck, iconClass: 'text-green-600' },
  error: { Icon: CircleAlert, iconClass: 'text-red-600' },
  info: { Icon: Info, iconClass: 'text-brand-600' },
};

// Renders the toasts from lib/toast.js. Mount once, near the app root.
export default function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts);

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map(({ id, type, message }) => {
        const { Icon, iconClass } = TYPES[type];
        return (
          <div
            key={id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-line bg-white p-4 text-sm text-ink shadow-raised"
          >
            <Icon className={cn('mt-px size-5 shrink-0', iconClass)} aria-hidden="true" />
            <p className="flex-1 leading-5">{message}</p>
            <button
              type="button"
              onClick={() => dismissToast(id)}
              className="-m-1 rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
