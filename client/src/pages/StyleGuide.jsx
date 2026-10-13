import { useState } from 'react';
import { Link2, Plus, Search, Trash2 } from 'lucide-react';
import Container from '../components/layout/Container';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dialog from '../components/ui/Dialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import Table from '../components/ui/Table';
import usePageTitle from '../hooks/usePageTitle';
import { toast } from '../lib/toast';

// Development-only page (/ui) for checking every shared component in one place.
// It is excluded from production builds (see App.jsx).

function Section({ title, children }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="mb-5 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

const SAMPLE_ROWS = [
  { code: 'abc123', destination: 'https://example.com/docs/getting-started', status: 'Active' },
  { code: 'spring', destination: 'https://example.com/shop/spring-collection', status: 'Expired' },
];

export default function StyleGuide() {
  usePageTitle('UI components');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold tracking-tight text-ink">UI components</h1>
      <p className="mt-2 text-ink-muted">Development reference. Example content only.</p>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">
            <Trash2 className="size-4" aria-hidden="true" />
            Danger
          </Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-brand-600 p-4">
          <Button variant="light">Light</Button>
          <Button variant="outline-light">Outline light</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Input label="Destination URL" placeholder="https://example.com/long-page" />
          <Input label="Custom alias" hint="Letters, numbers, hyphens, and underscores." placeholder="spring-sale" />
          <Input label="With error" defaultValue="not a url" error="Enter a valid http or https URL." />
          <Input label="Disabled" defaultValue="Read only value" disabled />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">Active</Badge>
          <Badge tone="warning">Expiring</Badge>
          <Badge tone="danger">Disabled</Badge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-5 sm:grid-cols-3">
          <Card padding="sm">Small padding</Card>
          <Card>Medium padding</Card>
          <Card padding="lg">Large padding</Card>
        </div>
      </Section>

      <Section title="Table">
        <Table caption="Example links">
          <thead>
            <tr>
              <th scope="col">Short code</th>
              <th scope="col">Destination</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row) => (
              <tr key={row.code}>
                <td className="font-medium">{row.code}</td>
                <td className="max-w-xs truncate text-ink-muted">{row.destination}</td>
                <td>
                  <Badge tone={row.status === 'Active' ? 'success' : 'warning'}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Loading skeleton">
        <Card className="max-w-md space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </Section>

      <Section title="Empty and error states">
        <div className="grid gap-5 md:grid-cols-2">
          <EmptyState
            icon={Search}
            title="No links found"
            description="Try a different search term or clear the filters."
            action={<Button variant="secondary">Clear filters</Button>}
          />
          <ErrorState onRetry={() => toast.info('Retry clicked')} />
        </div>
      </Section>

      <Section title="Dialog and toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Link copied to clipboard')}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Could not create the link. Please try again.')}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Your QR code is ready')}>
            Info toast
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Delete this link?"
          description="Anyone who opens it will see a “link not found” page."
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDialogOpen(false);
                  toast.success('Dialog confirmed');
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
            <Link2 className="size-4 text-brand-600" aria-hidden="true" />
            example.com/abc123
          </div>
        </Dialog>
      </Section>
    </Container>
  );
}
