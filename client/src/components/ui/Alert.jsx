import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

const TONES = {
  info: { Icon: Info, className: 'border-brand-100 bg-brand-50 text-brand-800' },
  success: { Icon: CircleCheck, className: 'border-green-200 bg-green-50 text-green-800' },
  warning: { Icon: TriangleAlert, className: 'border-amber-200 bg-amber-50 text-amber-900' },
  error: { Icon: CircleAlert, className: 'border-red-200 bg-red-50 text-red-800' },
};

// Inline message box. Errors use role="alert" so screen readers announce them immediately.
export default function Alert({ tone = 'info', title, children, className }) {
  const { Icon, className: toneClass } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
    </div>
  );
}
