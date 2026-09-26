/**
 * Карта на изложител в списъка (вдъхновена от Batimat):
 * лого | име, държава, описание, категории | щанд + бутони за контакт.
 * Акцентираните (Featured) изложители имат цветна лента отгоре.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompanyLogo } from "./company-logo";
import { GlobeIcon, MailIcon, PhoneIcon, StandIcon } from "@/components/icons";
import { companyName, localDescription, localName } from "@/lib/i18n-fields";
import { countryName } from "@/lib/countries";
import { cn, normalizeUrl } from "@/lib/utils";
import type { ExhibitorCard as Card } from "@/lib/catalog";

export async function ExhibitorCard({
  ex,
  locale,
  featured,
  exhibitionSlug,
  priority,
}: {
  ex: Card;
  locale: string;
  featured: boolean;
  exhibitionSlug: string | null;
  priority?: boolean;
}) {
  const t = await getTranslations("catalog");
  const name = companyName(locale, ex);
  const description = localDescription(locale, ex);
  const website = normalizeUrl(ex.website);

  // Щандове: за избраното изложение, иначе за активните изложения.
  const booths = ex.participations.filter((p) =>
    exhibitionSlug ? p.exhibition.slug === exhibitionSlug : p.exhibition.status === "ACTIVE",
  );
  const isNew = booths.some((p) => p.isNewExhibitor);
  const categories = ex.categories.map((c) => localName(locale, c.category));
  const href = `/exhibitors/${ex.slug}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md",
        featured ? "border-accent-500" : "border-gray-200",
      )}
    >
      {featured && (
        <div className="bg-accent-500 px-4 py-1.5 text-xs font-semibold tracking-wide text-white uppercase">
          {t("featured")}
        </div>
      )}
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <Link href={href} className="shrink-0 self-start" tabIndex={-1} aria-hidden>
          <CompanyLogo src={ex.logo} name={name} className="size-24 sm:size-28" priority={priority} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg leading-snug font-bold">
              <Link href={href} className="text-brand-700 hover:underline">
                {name}
              </Link>
            </h2>
            {isNew && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {t("newExhibitor")}
              </span>
            )}
          </div>
          {(ex.country || ex.city) && (
            <p className="mt-0.5 text-sm text-gray-500">
              {[ex.city, countryName(ex.country, locale)].filter(Boolean).join(", ")}
            </p>
          )}
          {description && <p className="mt-2 line-clamp-3 text-sm text-gray-700">{description}</p>}
          {categories.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("categories")}>
              {categories.slice(0, 4).map((c) => (
                <li key={c} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-800">
                  {c}
                </li>
              ))}
              {categories.length > 4 && (
                <li className="px-1 text-xs text-gray-500">{t("moreCategories", { count: categories.length - 4 })}</li>
              )}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-3 sm:w-52 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          {booths.map((p) =>
            p.boothNumber ? (
              <p key={p.exhibition.id} className="flex items-start gap-2 text-sm">
                <StandIcon className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {t("stand")} <b className="text-gray-900">{p.boothNumber}</b>
                  {p.hall && <span className="text-gray-500"> · {p.hall}</span>}
                  {!exhibitionSlug && booths.length > 1 && (
                    <span className="block text-xs text-gray-500">{localName(locale, p.exhibition)}</span>
                  )}
                </span>
              </p>
            ) : null,
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm sm:flex-col">
            {website && (
              <a href={website} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-2 text-brand-600 hover:underline">
                <GlobeIcon /> {t("website")}
              </a>
            )}
            {ex.email && (
              <a href={`mailto:${ex.email}`} className="inline-flex items-center gap-2 text-brand-600 hover:underline">
                <MailIcon /> {t("email")}
              </a>
            )}
            {ex.phone && (
              <a href={`tel:${ex.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 text-brand-600 hover:underline">
                <PhoneIcon /> {t("phone")}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
