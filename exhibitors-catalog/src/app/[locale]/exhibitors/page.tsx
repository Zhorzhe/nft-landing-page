/**
 * Каталог на всички изложители: /bg/exhibitors, /en/exhibitors
 * Филтрите са в адреса: ?q=&exhibition=&category=&country=&letter=&featured=1&new=1&page=
 */
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/catalog/catalog-view";
import { PageHero } from "@/components/catalog/page-hero";
import { getCatalog, getPublicExhibition, parseFilters } from "@/lib/catalog";
import { localName } from "@/lib/i18n-fields";
import { alternates } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/[locale]/exhibitors">): Promise<Metadata> {
  const { locale } = await props.params;
  const filters = parseFilters(await props.searchParams);
  const t = await getTranslations({ locale, namespace: "catalog" });
  const exhibition = filters.exhibition ? await getPublicExhibition(filters.exhibition) : null;
  const name = exhibition ? localName(locale, exhibition) : null;
  // Филтрираните изгледи не се индексират отделно (избягваме дублирано съдържание),
  // освен филтъра по изложение, който има собствена страница /exhibitions/[slug].
  const filtered = Boolean(filters.q || filters.categories.length || filters.country || filters.letter || filters.page > 1);
  return {
    title: name ? t("titleFor", { exhibition: name }) : t("title"),
    description: name ? t("descriptionFor", { exhibition: name }) : t("description"),
    alternates: alternates("/exhibitors", locale),
    robots: filtered || exhibition ? { index: false, follow: true } : undefined,
  };
}

export default async function ExhibitorsPage(props: PageProps<"/[locale]/exhibitors">) {
  await connection();
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const filters = parseFilters(await props.searchParams);
  const [result, exhibition] = await Promise.all([
    getCatalog(filters),
    filters.exhibition ? getPublicExhibition(filters.exhibition) : null,
  ]);

  return (
    <>
      <PageHero title={exhibition ? t("titleFor", { exhibition: localName(locale, exhibition) }) : t("title")} />
      <CatalogView locale={locale} filters={filters} result={result} basePath="/exhibitors" />
    </>
  );
}
