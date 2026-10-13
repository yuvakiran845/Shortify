import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal dialog built on the native <dialog> element.
 * The browser handles focus trapping, the Escape key, and the backdrop;
 * we only sync the `open` prop and report close requests through `onClose`.
 */
export default function Dialog({ open, onClose, title, description, children, footer }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      dialog.showModal();
      // The browser focuses the first focusable element (the close button).
      // A field marked data-autofocus gets focus instead, so typing can start right away.
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape key: let the parent decide whether to close
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is a backdrop click
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-white p-0 text-ink shadow-raised backdrop:bg-ink/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1.5 rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
      {footer && (
        <div className="flex flex-col-reverse gap-2 rounded-b-xl border-t border-line bg-surface px-6 py-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </dialog>
  );
}
