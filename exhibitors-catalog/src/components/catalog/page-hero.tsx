/**
 * Заглавна лента на страниците: синя, с фин оранжев акцент отгоре
 * (както заглавието на изложбата във формулярите).
 */
export function PageHero({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-brand-800 pt-10 pb-16 text-center text-white">
      <HeroPattern />
      <div className="relative mx-auto max-w-4xl px-4">
        {eyebrow && <p className="mb-2 text-xs font-bold tracking-[0.14em] text-accent-500 uppercase">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-3 text-brand-100">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

/** Декоративен фон: меки кръгове в стила на цветето от логото. */
export function HeroPattern() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
      <div className="absolute -top-24 -right-16 size-72 rounded-full bg-white/5" />
      <div className="absolute top-10 -right-28 size-56 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-white/[0.04]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-accent-500" />
    </div>
  );
}
