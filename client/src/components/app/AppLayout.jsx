import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router';
import { Menu } from 'lucide-react';
import AppSidebar from './AppSidebar';
import CreateLinkDialog from './CreateLinkDialog';
import MobileDrawer from './MobileDrawer';
import Logo from '../layout/Logo';
import ScrollManager from '../layout/ScrollManager';
import SkipLink from '../layout/SkipLink';
import UserMenu from '../layout/UserMenu';

const DESKTOP_QUERY = '(min-width: 1024px)'; // Tailwind's lg breakpoint

/**
 * Layout for signed-in pages.
 * - Desktop (lg and up): fixed sidebar on the left, page content on the right.
 * - Phones/tablets: top bar with a menu button that opens the same sidebar as a drawer.
 * It also owns the "Create link" dialog and shares it with pages via the
 * Outlet context (read it with the useAppShell hook).
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [linksVersion, setLinksVersion] = useState(0);

  // If the screen grows to desktop size while the drawer is open, close it
  // (the drawer is hidden there, and an invisible open dialog would block the page).
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => {
      if (event.matches) setDrawerOpen(false);
    };
    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, [drawerOpen]);

  // Shared with pages through <Outlet context>. Memoized so pages only
  // re-render when linksVersion actually changes.
  const shell = useMemo(
    () => ({
      openCreateLink: () => {
        setDrawerOpen(false);
        setCreateOpen(true);
      },
      linksVersion,
    }),
    [linksVersion],
  );
  const { openCreateLink } = shell;

  return (
    <div className="min-h-dvh bg-surface">
      <SkipLink />
      <ScrollManager />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <AppSidebar onCreateLink={openCreateLink} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-sm sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="-ml-2 grid size-10 place-items-center rounded-lg text-ink transition-colors hover:bg-surface-2"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Logo />
        <UserMenu />
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <AppSidebar onNavigate={() => setDrawerOpen(false)} onCreateLink={openCreateLink} />
      </MobileDrawer>

      <main id="main" className="lg:pl-64">
        <Outlet context={shell} />
      </main>

      <CreateLinkDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setLinksVersion((version) => version + 1)}
      />
    </div>
  );
}
