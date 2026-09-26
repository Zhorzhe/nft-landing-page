/**
 * Страница на изложител: /bg/exhibitors/agro-shtit-ood
 * Лого, описание, категории, контакти, социални мрежи, участия (щандове).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompanyLogo } from "@/components/catalog/company-logo";
import {
  ArrowLeftIcon,
  CalendarIcon,
  FacebookIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  StandIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/icons";
import { getExhibitorBySlug } from "@/lib/catalog";
import { companyName, localDescription, localName } from "@/lib/i18n-fields";
import { countryName } from "@/lib/countries";
import { alternates, truncate } from "@/lib/seo";
import { displayUrl, formatDateRange, normalizeUrl, SITE_URL } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/[locale]/exhibitors/[slug]">): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const ex = await getExhibitorBySlug(slug);
  if (!ex) return {};
  const name = companyName(locale, ex);
  const description = localDescription(locale, ex);
  return {
    title: name,
    description: truncate(description || name),
    alternates: alternates(`/exhibitors/${slug}`, locale),
    openGraph: { title: name, description: truncate(description || name), images: ex.logo ? [ex.logo] : undefined },
  };
}

export default async function ExhibitorPage(props: PageProps<"/[locale]/exhibitors/[slug]">) {
  await connection();
  const { locale, slug } = await props.params;
  setRequestLocale(locale);
  const ex = await getExhibitorBySlug(slug);
  if (!ex) notFound();
  const t = await getTranslations("exhibitor");

  const name = companyName(locale, ex);
  const description = localDescription(locale, ex);
  const website = normalizeUrl(ex.website);
  const location = [ex.city, countryName(ex.country, locale)].filter(Boolean).join(", ");
  const socials = [
    { url: ex.facebook, label: "Facebook", Icon: FacebookIcon },
    { url: ex.instagram, label: "Instagram", Icon: InstagramIcon },
    { url: ex.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
    { url: ex.youtube, label: "YouTube", Icon: YoutubeIcon },
    { url: ex.x, label: "X", Icon: XIcon },
  ].filter((s) => s.url);
  const isNew = ex.participations.some((p) => p.isNewExhibitor && p.exhibition.status === "ACTIVE");

  // Структурирани данни (schema.org Organization) за търсачките.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ex.companyName,
    ...(ex.companyNameEn ? { alternateName: ex.companyNameEn } : {}),
    url: `${SITE_URL}/${locale}/exhibitors/${ex.slug}`,
    ...(ex.logo ? { logo: ex.logo.startsWith("http") ? ex.logo : `${SITE_URL}${ex.logo}` } : {}),
    ...(description ? { description } : {}),
    ...(ex.email ? { email: ex.email } : {}),
    ...(ex.phone ? { telephone: ex.phone } : {}),
    ...(ex.country || ex.city || ex.address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(ex.address ? { streetAddress: ex.address } : {}),
            ...(ex.city ? { addressLocality: ex.city } : {}),
            ...(ex.country ? { addressCountry: ex.country } : {}),
          },
        }
      : {}),
    sameAs: [website, ...socials.map((s) => s.url)].filter(Boolean),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/exhibitors" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
        <ArrowLeftIcon width={16} height={16} /> {t("backToCatalog")}
      </Link>

      <header className="card mt-4 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <CompanyLogo src={ex.logo} name={name} className="size-32 shrink-0 sm:size-40" priority />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{name}</h1>
          {locale === "en" && ex.companyNameEn && ex.companyNameEn !== ex.companyName && (
            <p className="text-gray-500">{ex.companyName}</p>
          )}
          {location && (
            <p className="mt-2 flex items-center gap-1.5 text-gray-600">
              <PinIcon className="text-gray-400" /> {location}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {isNew && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {(await getTranslations("catalog"))("newExhibitor")}
              </span>
            )}
            {ex.categories.map(({ category }) => (
              <Link
                key={category.id}
                href={`/exhibitors?category=${category.slug}`}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-800 hover:bg-brand-100"
              >
                {localName(locale, category)}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">{t("about")}</h2>
            {description ? (
              <p className="leading-relaxed whitespace-pre-line text-gray-700">{description}</p>
            ) : (
              <p className="text-gray-500 italic">{t("noDescription")}</p>
            )}
          </section>

          {ex.participations.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-3 text-lg font-bold">{t("participations")}</h2>
              <ul className="divide-y">
                {ex.participations.map((p) => (
                  <li key={p.exhibitionId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link href={`/exhibitions/${p.exhibition.slug}`} className="font-semibold text-brand-700 hover:underline">
                        {localName(locale, p.exhibition)}
                      </Link>
                      {p.exhibition.status === "ARCHIVED" && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-gray-600">{t("archived")}</span>
                      )}
                      <p className="flex items-center gap-1.5 text-sm text-gray-500">
                        <CalendarIcon width={14} height={14} />
                        {formatDateRange(p.exhibition.startDate, p.exhibition.endDate, locale)}
                      </p>
                    </div>
                    {(p.boothNumber || p.hall) && (
                      <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-900">
                        <StandIcon />
                        {p.boothNumber && (
                          <span>
                            {t("stand")} <b>{p.boothNumber}</b>
                          </span>
                        )}
                        {p.hall && <span className="text-brand-700">· {p.hall}</span>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">{t("contacts")}</h2>
            <dl className="space-y-3 text-sm">
              {website && (
                <Contact icon={<GlobeIcon />} label={t("website")}>
                  <a href={website} target="_blank" rel="noopener nofollow" className="break-all text-brand-600 hover:underline">
                    {displayUrl(website)}
                  </a>
                </Contact>
              )}
              {ex.email && (
                <Contact icon={<MailIcon />} label={t("email")}>
                  <a href={`mailto:${ex.email}`} className="break-all text-brand-600 hover:underline">
                    {ex.email}
                  </a>
                </Contact>
              )}
              {ex.phone && (
                <Contact icon={<PhoneIcon />} label={t("phone")}>
                  <a href={`tel:${ex.phone.replace(/[^\d+]/g, "")}`} className="text-brand-600 hover:underline">
                    {ex.phone}
                  </a>
                </Contact>
              )}
              {(ex.address || location) && (
                <Contact icon={<PinIcon />} label={t("address")}>
                  {[ex.address, location].filter(Boolean).join(", ")}
                </Contact>
              )}
            </dl>
            {socials.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-500">{t("social")}</h3>
                <div className="flex gap-2">
                  {socials.map(({ url, label, Icon }) => (
                    <a
                      key={label}
                      href={url!}
                      target="_blank"
                      rel="noopener nofollow"
                      aria-label={label}
                      title={label}
                      className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-brand-600 hover:text-white"
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Contact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-gray-800">{children}</dd>
      </div>
    </div>
  );
}
