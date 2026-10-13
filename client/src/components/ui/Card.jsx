import { cn } from '../../lib/cn';

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// White surface with a subtle border and shadow. `as` changes the HTML element.
export default function Card({ as: Component = 'div', padding = 'md', className, ...props }) {
  return (
    <Component
      className={cn('rounded-xl border border-line bg-white shadow-card', paddings[padding], className)}
      {...props}
    />
  );
}
