// Joins class names and skips falsy values:
// cn('px-4', isActive && 'bg-brand-50') -> 'px-4 bg-brand-50' or 'px-4'
export const cn = (...classes) => classes.filter(Boolean).join(' ');
