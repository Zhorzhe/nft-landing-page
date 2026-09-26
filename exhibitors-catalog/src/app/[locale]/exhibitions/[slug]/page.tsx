/**
 * Страница на изложение със списъка на неговите изложители:
 * /bg/exhibitions/agra-2027 — индексируема, с отделни метаданни.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/catalog/catalog-view";
import { PageHero } from "@/components/catalog/page-hero";
import { getCatalog, getPublicExhibition, parseFilters } from "@/lib/catalog";
import { localName, pick } from "@/lib/i18n-fields";
import { alternates, truncate } from "@/lib/seo";
import { formatDateRange, normalizeUrl } from "@/lib/utils";
import { CalendarIcon, PinIcon } from "@/components/icons";

export async function generateMetadata(props: PageProps<"/[locale]/exhibitions/[slug]">): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const ex = await getPublicExhibition(slug);
  if (!ex) return {};
  const t = await getTranslations({ locale, namespace: "catalog" });
  const name = localName(locale, ex);
  const description = pick(locale, ex.descriptionBg, ex.descriptionEn);
  const sp = await props.searchParams;
  return {
    title: t("titleFor", { exhibition: name }),
    description: truncate(description || t("descriptionFor", { exhibition: name })),
    alternates: alternates(`/exhibitions/${slug}`, locale),
    openGraph: ex.logo ? { images: [ex.logo] } : undefined,
    robots: Object.keys(sp).length ? { index: false, follow: true } : undefined,
  };
}

export default async function ExhibitionPage(props: PageProps<"/[locale]/exhibitions/[slug]">) {
  await connection();
  const { locale, slug } = await props.params;
  setRequestLocale(locale);
  const ex = await getPublicExhibition(slug);
  if (!ex) notFound();

  const t = await getTranslations("exhibitions");
  const filters = { ...parseFilters(await props.searchParams), exhibition: slug };
  const result = await getCatalog(filters);
  const website = normalizeUrl(ex.website);
  const description = pick(locale, ex.descriptionBg, ex.descriptionEn);

  // Структурирани данни (schema.org Event) за търсачките.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    name: localName(locale, ex),
    startDate: ex.startDate.toISOString().slice(0, 10),
    endDate: ex.endDate.toISOString().slice(0, 10),
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: ex.venue || "International Fair Plovdiv",
      address: { "@type": "PostalAddress", addressLocality: "Plovdiv", addressCountry: "BG" },
    },
    organizer: { "@type": "Organization", name: "International Fair Plovdiv", url: "https://fair.bg" },
    ...(description ? { description } : {}),
    ...(ex.logo ? { image: ex.logo } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero
        title={localName(locale, ex)}
        subtitle={
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon /> {formatDateRange(ex.startDate, ex.endDate, locale)}
            </span>
            {ex.venue && (
              <span className="inline-flex items-center gap-1.5">
                <PinIcon /> {ex.venue}
              </span>
            )}
            {ex.status === "ARCHIVED" && <span className="rounded bg-white/20 px-2 py-0.5">{t("archive")}</span>}
            {website && (
              <a href={website} target="_blank" rel="noopener" className="underline hover:text-white">
                {t("website")} ↗
              </a>
            )}
          </div>
        }
      />
      <CatalogView locale={locale} filters={filters} result={result} basePath={`/exhibitions/${slug}`} fixedExhibition />
    </>
  );
}
