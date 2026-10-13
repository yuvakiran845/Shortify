import { Link } from 'react-router';
import Container from './Container';
import Logo from './Logo';
import { ROUTES, SECTIONS } from '../../lib/routes';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Shorten a URL', to: ROUTES.shorten },
      { label: 'My links', to: ROUTES.links },
      { label: 'QR Code Generator', to: ROUTES.qr },
      { label: 'Features', to: SECTIONS.features },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'How it works', to: SECTIONS.howItWorks },
      { label: 'FAQ', to: SECTIONS.faq },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', to: ROUTES.login },
      { label: 'Sign up', to: ROUTES.signup },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-6 text-ink-muted">
              Shorten links, generate QR codes, and see how every link performs, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="rounded-sm text-sm text-ink-muted transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-sm text-ink-subtle">
          © {year} Shortify. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
