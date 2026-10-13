import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { LogOut, Menu, X } from 'lucide-react';
import Avatar from './Avatar';
import Container from './Container';
import Logo from './Logo';
import UserMenu from './UserMenu';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import useAuth from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import { cn } from '../../lib/cn';
import { ROUTES, SECTIONS } from '../../lib/routes';

// `section` links jump to part of the landing page, so they are never shown as "active".
// `wideOnly` links are hidden in the desktop bar on medium screens to keep it on one line.
const NAV_LINKS = [
  { label: 'Shorten', to: ROUTES.shorten },
  { label: 'QR codes', to: ROUTES.qr },
  { label: 'Features', to: SECTIONS.features, section: true, wideOnly: true },
  { label: 'FAQ', to: SECTIONS.faq, section: true, wideOnly: true },
];

// NavLink adds aria-current="page" automatically on the current page.
const navLinkClass = (link, extra) =>
  ({ isActive }) =>
    cn(
      'rounded-md font-medium transition-colors',
      isActive && !link.section ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      extra,
    );

export default function Navbar() {
  const { status, user } = useAuth();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // While the mobile menu is open: close it on Escape, or if the screen grows to desktop size.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const handleResize = (event) => {
      if (event.matches) setMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    desktopQuery.addEventListener('change', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      desktopQuery.removeEventListener('change', handleResize);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo onClick={closeMenu} />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to} className={link.wideOnly ? 'hidden lg:block' : undefined}>
                <NavLink to={link.to} className={navLinkClass(link, 'px-3 py-2 text-sm')}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {status === 'loading' && <Skeleton className="h-10 w-40 rounded-full" />}
          {status === 'authenticated' && (
            <>
              <Button to={ROUTES.dashboard} variant="secondary">
                Dashboard
              </Button>
              <UserMenu />
            </>
          )}
          {(status === 'anonymous' || status === 'error') && (
            <>
              <Button to={ROUTES.login} variant="ghost">
                Log in
              </Button>
              <Button to={ROUTES.signup}>Sign up</Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-2 md:hidden"
        >
          {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </Container>

      <div id="mobile-menu" hidden={!menuOpen} className="border-t border-line bg-white md:hidden">
        <Container className="py-4">
          <nav aria-label="Mobile">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} onClick={closeMenu} className={navLinkClass(link, 'block px-3 py-2.5 text-base')}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 grid gap-2 border-t border-line pt-4">
            {status === 'authenticated' ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={user.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-sm text-ink-subtle">{user.email}</p>
                  </div>
                </div>
                <Button to={ROUTES.dashboard} size="lg" onClick={closeMenu}>
                  Go to dashboard
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button to={ROUTES.login} variant="secondary" size="lg" onClick={closeMenu}>
                  Log in
                </Button>
                <Button to={ROUTES.signup} size="lg" onClick={closeMenu}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </Container>
      </div>
    </header>
  );
}
