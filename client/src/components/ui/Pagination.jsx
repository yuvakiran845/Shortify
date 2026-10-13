import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

// Previous / "Page X of Y" / Next. Renders nothing when there is only one page.
export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </Button>
      <p className="text-sm text-ink-muted">
        Page <span className="font-semibold text-ink">{page}</span> of{' '}
        <span className="font-semibold text-ink">{totalPages}</span>
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
