import { cn } from '../../lib/cn';

/**
 * Horizontally scrollable data table.
 * Cell styles come from the .data-table rules in index.css,
 * so pages only write plain <thead>/<tbody>/<tr>/<th>/<td>.
 * `flush`: no outer border or shadow, for tables placed inside a Card.
 */
export default function Table({ caption, flush = false, className, children }) {
  return (
    <div className={cn('overflow-x-auto bg-white', !flush && 'rounded-xl border border-line shadow-card')}>
      <table className={cn('data-table', className)}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
