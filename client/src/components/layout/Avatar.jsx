// "Ana Lima" -> "AL"
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function Avatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white"
    >
      {initials(name)}
    </span>
  );
}
