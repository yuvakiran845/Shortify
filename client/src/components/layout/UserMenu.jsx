import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronsUpDown, LayoutDashboard, Link2, LogOut } from 'lucide-react';
import Avatar from './Avatar';
import useAuth from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import { cn } from '../../lib/cn';
import { ROUTES } from '../../lib/routes';

/**
 * Account button with a small dropdown panel.
 * A "disclosure" pattern (button + panel) keeps it simple and accessible:
 * aria-expanded tells screen readers whether the panel is open.
 *
 * variant "compact": avatar + first name (navbar / mobile top bar)
 * variant "full":    avatar + name + email, full width (bottom of the sidebar)
 * placement "top":   panel opens upward (for the bottom of the sidebar)
 */
export default function UserMenu({ variant = 'compact', placement = 'bottom', onNavigate }) {
  const { user } = useAuth();
  const handleLogout = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  // While open: close on a click outside, on Escape, or when keyboard focus
  // moves out of the menu (e.g. tabbing past the last item).
  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', closeIfOutside);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', closeIfOutside);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };
  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink';
  const isFull = variant === 'full';

  return (
    <div ref={containerRef} className={cn('relative', isFull && 'w-full')}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex items-center gap-2 transition-colors hover:bg-surface-2',
          isFull ? 'w-full rounded-lg p-2 text-left' : 'rounded-full py-1 pr-2 pl-1',
        )}
      >
        <Avatar name={user.name} />
        {isFull ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
            <span className="block truncate text-xs text-ink-subtle">{user.email}</span>
          </span>
        ) : (
          <span className="max-w-32 truncate text-sm font-medium text-ink">{user.name.split(' ')[0]}</span>
        )}
        {isFull ? (
          <ChevronsUpDown className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 text-ink-subtle" aria-hidden="true" />
        )}
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={panelId}
          className={cn(
            'absolute z-50 w-64 rounded-xl border border-line bg-white p-2 shadow-raised',
            placement === 'top' ? 'bottom-full left-0 mb-2' : 'right-0 mt-2',
          )}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-subtle">{user.email}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link to={ROUTES.dashboard} onClick={close} className={itemClass}>
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Dashboard
          </Link>
          <Link to={ROUTES.links} onClick={close} className={itemClass}>
            <Link2 className="size-4" aria-hidden="true" />
            My links
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              handleLogout();
            }}
            className={itemClass}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
