/** Начална страница: търсене, статистика, активни изложения, браншове. */
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExhibitionCard } from "@/components/catalog/exhibition-card";
import { SearchIcon } from "@/components/icons";
import { HeroPattern } from "@/components/catalog/page-hero";
import { getExhibitionsWithCounts, getStats } from "@/lib/catalog";
import { db } from "@/lib/db";
import { localName } from "@/lib/i18n-fields";
import { alternates } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { description: t("subtitle"), alternates: alternates("/", locale) };
}

export default async function HomePage(props: PageProps<"/[locale]">) {
  await connection();
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const [stats, exhibitions, categories] = await Promise.all([
    getStats(),
    getExhibitionsWithCounts("ACTIVE"),
    db.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }],
      include: { _count: { select: { exhibitors: { where: { exhibitor: { isPublished: true } } } } } },
    }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden text-white">
        <HeroPattern />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-accent-500 uppercase">{tc("org")}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">{t("subtitle")}</p>
          <form action={`/${locale}/exhibitors`} method="get" role="search" className="mx-auto mt-8 flex max-w-2xl overflow-hidden rounded-lg bg-white shadow-lift focus-within:ring-4 focus-within:ring-brand-300">
            <label htmlFor="home-q" className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 px-6 py-4 text-base text-ink outline-none placeholder:text-muted"
              enterKeyHint="search"
            />
            <button className="m-1.5 flex items-center gap-2 rounded-md bg-accent-500 px-6 font-bold text-ink hover:bg-accent-600">
              <SearchIcon width={20} height={20} />
              <span className="hidden sm:inline">{t("search")}</span>
            </button>
          </form>
          <dl className="mx-auto mt-12 grid max-w-xl grid-cols-3 divide-x divide-white/15">
            {[
              [stats.exhibitors, t("statsExhibitors")],
              [stats.exhibitions, t("statsExhibitions")],
              [stats.categories, t("statsCategories")],
            ].map(([value, label]) => (
              <div key={label as string}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-3xl font-extrabold sm:text-4xl">{value}</dd>
                <dd className="text-sm text-brand-200">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="border-l-4 border-accent-500 pl-3 text-2xl font-extrabold text-brand-800">{t("activeExhibitions")}</h2>
          <Link href="/exhibitors" className="text-sm font-semibold text-brand-600 hover:underline">
            {t("browseAll")} →
          </Link>
        </div>
        {exhibitions.length === 0 && <p className="text-gray-600">{t("noActive")}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((e) => (
            <ExhibitionCard key={e.id} exhibition={e} locale={locale} />
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-4">
          <h2 className="mb-5 border-l-4 border-accent-500 pl-3 text-2xl font-extrabold text-brand-800">{t("browseCategories")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/exhibitors?category=${c.slug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-[#dfe5ec] bg-white px-4 py-3.5 text-[15px] font-semibold text-ink shadow-soft transition hover:border-brand-600 hover:text-brand-700"
              >
                {localName(locale, c)}
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                  {c._count.exhibitors}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
