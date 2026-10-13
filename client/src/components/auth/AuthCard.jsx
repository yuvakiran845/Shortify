import Card from '../ui/Card';
import { LogoMark } from '../layout/Logo';

// Shared layout for the Log in and Sign up pages.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <LogoMark className="mx-auto size-10" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
        </div>
        <Card padding="lg" className="mt-8">
          {children}
        </Card>
        {footer && <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>}
      </div>
    </div>
  );
}
