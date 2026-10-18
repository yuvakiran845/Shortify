import { Link2, MousePointerClick, Plus, QrCode } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { ROUTES } from '../../lib/routes';

// Shown on the Overview page while the account has no links yet.
export default function GetStarted({ onCreateLink }) {
  const steps = [
    {
      icon: Link2,
      title: 'Create your first short link',
      text: 'Paste any long URL and get a short link in one click.',
      action: (
        <Button size="sm" onClick={onCreateLink}>
          <Plus className="size-4" aria-hidden="true" />
          Create link
        </Button>
      ),
    },
    {
      icon: QrCode,
      title: 'Make a QR code for it',
      text: 'Download a PNG for flyers, menus, packaging, or slides.',
      action: (
        <Button size="sm" variant="secondary" to={ROUTES.qr}>
          Open QR generator
        </Button>
      ),
    },
    {
      icon: MousePointerClick,
      title: 'Share it and watch the clicks',
      text: 'Every real visit is counted. Your totals appear right here.',
    },
  ];

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold text-ink">Get started with Shortify</h2>
      <p className="mt-1 text-sm text-ink-muted">You don&apos;t have any links yet. Here&apos;s how to begin.</p>
      <ol className="mt-6 grid gap-6 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text, action }, index) => (
          <li key={title} className="flex flex-col rounded-xl border border-line p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Step {index + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold text-ink">{title}</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-ink-muted">{text}</p>
            {action && <div className="mt-4">{action}</div>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
