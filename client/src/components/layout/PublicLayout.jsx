import { Outlet } from 'react-router';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollManager from './ScrollManager';
import SkipLink from './SkipLink';

// Shared shell for public pages: navbar, page content, footer.
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <ScrollManager />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
