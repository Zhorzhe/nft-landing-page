/** Синя лента със заглавие в горната част на страниците. */
export function PageHero({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-brand-700 to-brand-900 pt-10 pb-14 text-center text-white">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-3 text-brand-100">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}
