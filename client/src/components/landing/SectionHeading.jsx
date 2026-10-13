// Centered eyebrow + title + description used at the top of landing sections.
export default function SectionHeading({ id, eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-3xl font-bold tracking-tight text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-base leading-7 text-pretty text-ink-muted sm:text-lg">{description}</p>}
    </div>
  );
}
