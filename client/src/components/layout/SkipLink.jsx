// Keyboard users: the first Tab reveals this link (it slides in from above the
// screen) so they can jump past the navigation straight to the page content.
export default function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-raised transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}
