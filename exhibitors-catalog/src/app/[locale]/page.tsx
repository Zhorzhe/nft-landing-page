/** Начална страница: търсене, статистика, активни изложения, браншове. */
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExhibitionCard } from "@/components/catalog/exhibition-card";
import { SearchIcon } from "@/components/icons";
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
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">{t("subtitle")}</p>
          <form action={`/${locale}/exhibitors`} method="get" role="search" className="mx-auto mt-8 flex max-w-2xl overflow-hidden rounded-full bg-white shadow-lg">
            <label htmlFor="home-q" className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 px-6 py-4 text-base text-gray-900 outline-none"
              enterKeyHint="search"
            />
            <button className="flex items-center gap-2 bg-accent-500 px-6 font-semibold text-white hover:bg-accent-600">
              <SearchIcon width={20} height={20} />
              <span className="hidden sm:inline">{t("search")}</span>
            </button>
          </form>
          <dl className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4">
            {[
              [stats.exhibitors, t("statsExhibitors")],
              [stats.exhibitions, t("statsExhibitions")],
              [stats.categories, t("statsCategories")],
            ].map(([value, label]) => (
              <div key={label as string}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-3xl font-extrabold">{value}</dd>
                <dd className="text-sm text-brand-200">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">{t("activeExhibitions")}</h2>
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
          <h2 className="mb-5 text-2xl font-bold">{t("browseCategories")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/exhibitors?category=${c.slug}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:border-brand-300 hover:text-brand-700"
              >
                {localName(locale, c)}
                <span className="text-gray-400">{c._count.exhibitors}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
