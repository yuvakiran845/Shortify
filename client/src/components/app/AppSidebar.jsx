import { NavLink } from 'react-router';
import { ChartColumn, LayoutDashboard, Link2, Plus, QrCode } from 'lucide-react';
import Logo from '../layout/Logo';
import UserMenu from '../layout/UserMenu';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';
import { ROUTES } from '../../lib/routes';

const APP_NAV = [
  { label: 'Overview', to: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'My links', to: ROUTES.links, icon: Link2 },
  { label: 'Analytics', to: ROUTES.analytics, icon: ChartColumn },
  { label: 'QR codes', to: ROUTES.qr, icon: QrCode },
];

/**
 * Sidebar contents: logo, "Create link", page links, and the account menu.
 * Used both in the fixed desktop sidebar and inside the mobile drawer.
 * `onNavigate` lets the drawer close itself after a link is chosen.
 */
export default function AppSidebar({ onNavigate, onCreateLink }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Logo onClick={onNavigate} />
      </div>

      <div className="p-4">
        <Button className="w-full" onClick={onCreateLink}>
          <Plus className="size-4" aria-hidden="true" />
          Create link
        </Button>
      </div>

      <nav aria-label="App" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {APP_NAV.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              {/* NavLink adds aria-current="page" on the current page */}
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <UserMenu variant="full" placement="top" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
