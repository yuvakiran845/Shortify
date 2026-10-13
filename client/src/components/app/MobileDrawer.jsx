import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Slide-in navigation panel for phones and tablets, built on the native
 * <dialog> element: the browser traps focus inside it, closes it on Escape,
 * and makes the page behind it inert.
 */
export default function MobileDrawer({ open, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Navigation"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dark backdrop (the dialog element itself) closes the drawer.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-line bg-white p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute top-3.5 right-3 z-10 grid size-9 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
