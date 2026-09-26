import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/catalog/page-hero";
import { ExhibitionCard } from "@/components/catalog/exhibition-card";
import { getExhibitionsWithCounts } from "@/lib/catalog";
import { alternates } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/[locale]/exhibitions">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "exhibitions" });
  return { title: t("title"), description: t("description"), alternates: alternates("/exhibitions", locale) };
}

export default async function ExhibitionsPage(props: PageProps<"/[locale]/exhibitions">) {
  await connection();
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("exhibitions");
  const tc = await getTranslations("common");
  const [active, archived] = await Promise.all([getExhibitionsWithCounts("ACTIVE"), getExhibitionsWithCounts("ARCHIVED")]);

  return (
    <>
      <PageHero eyebrow={tc("org")} title={t("title")} subtitle={t("description")} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-5 border-l-4 border-accent-500 pl-3 text-2xl font-extrabold text-brand-800">{t("active")}</h2>
        {active.length === 0 && <p className="text-gray-600">{t("noActive")}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((e) => (
            <ExhibitionCard key={e.id} exhibition={e} locale={locale} />
          ))}
        </div>
        {archived.length > 0 && (
          <>
            <h2 className="mt-12 mb-5 border-l-4 border-gray-300 pl-3 text-2xl font-extrabold text-muted">{t("archive")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((e) => (
                <ExhibitionCard key={e.id} exhibition={e} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
