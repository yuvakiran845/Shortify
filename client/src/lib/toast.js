// A tiny global toast store.
// Any file can call toast.success('Saved'); the <Toaster /> component
// subscribes to this store (via useSyncExternalStore) and renders the list.

const MAX_VISIBLE = 4;

let toasts = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts() {
  return toasts;
}

export function dismissToast(id) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function show(type, message, { duration = 4000 } = {}) {
  const id = nextId;
  nextId += 1;

  toasts = [...toasts, { id, type, message }].slice(-MAX_VISIBLE);
  emit();

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export const toast = {
  success: (message, options) => show('success', message, options),
  error: (message, options) => show('error', message, { duration: 6000, ...options }),
  info: (message, options) => show('info', message, options),
};
