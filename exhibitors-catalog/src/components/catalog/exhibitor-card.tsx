/**
 * Карта на изложител в списъка (вдъхновена от Batimat):
 * лого | име, държава, описание, категории | щанд + бутони за контакт.
 * Акцентираните (Featured) изложители имат оранжев ляв ръб и етикет.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompanyLogo } from "./company-logo";
import { GlobeIcon, MailIcon, PhoneIcon, PinIcon, StandIcon } from "@/components/icons";
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
        "group/card relative overflow-hidden rounded-lg border bg-white shadow-soft transition-shadow hover:shadow-lift",
        featured ? "border-accent-500/60 border-l-4 border-l-accent-500" : "border-[#dfe5ec]",
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <Link href={href} className="shrink-0 self-start" tabIndex={-1} aria-hidden>
          <CompanyLogo src={ex.logo} name={name} className="size-24 sm:size-28" priority={priority} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {featured && (
              <span className="rounded bg-accent-500 px-2 py-0.5 text-[11px] font-bold tracking-wider text-ink uppercase">
                {t("featured")}
              </span>
            )}
            {isNew && (
              <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">
                {t("newExhibitor")}
              </span>
            )}
          </div>
          <h2 className="mt-1 text-lg leading-snug font-bold text-balance">
            <Link href={href} className="text-brand-700 after:absolute after:inset-0 hover:underline">
              {name}
            </Link>
          </h2>
          {(ex.country || ex.city) && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <PinIcon width={14} height={14} className="shrink-0" />
              {[ex.city, countryName(ex.country, locale)].filter(Boolean).join(", ")}
            </p>
          )}
          {description && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink/85">{description}</p>}
          {categories.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("categories")}>
              {categories.slice(0, 4).map((c) => (
                <li key={c} className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                  {c}
                </li>
              ))}
              {categories.length > 4 && (
                <li className="px-1 text-xs text-muted">{t("moreCategories", { count: categories.length - 4 })}</li>
              )}
            </ul>
          )}
        </div>

        <div className="relative z-10 flex shrink-0 flex-col gap-2 sm:w-56">
          {booths.map((p) =>
            p.boothNumber ? (
              <div key={p.exhibition.id} className="flex items-start gap-2.5 rounded-md bg-brand-50 px-3 py-2">
                <StandIcon className="mt-0.5 shrink-0 text-brand-600" />
                <div className="text-sm leading-tight">
                  <span className="text-muted">{t("stand")}</span>{" "}
                  <b className="text-base text-brand-800">{p.boothNumber}</b>
                  {p.hall && <span className="block text-xs text-muted">{p.hall}</span>}
                  {!exhibitionSlug && booths.length > 1 && (
                    <span className="block text-xs font-medium text-brand-700">{localName(locale, p.exhibition)}</span>
                  )}
                </div>
              </div>
            ) : null,
          )}
          <div className="flex flex-wrap gap-1.5">
            {website && (
              <a href={website} target="_blank" rel="noopener nofollow" title={t("website")} className={ACTION}>
                <GlobeIcon width={16} height={16} /> {t("website")}
              </a>
            )}
            {ex.email && (
              <a href={`mailto:${ex.email}`} title={t("email")} className={ACTION}>
                <MailIcon width={16} height={16} /> {t("email")}
              </a>
            )}
            {ex.phone && (
              <a href={`tel:${ex.phone.replace(/[^\d+]/g, "")}`} title={t("phone")} className={ACTION}>
                <PhoneIcon width={16} height={16} /> {t("phone")}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const ACTION =
  "inline-flex items-center gap-1.5 rounded-md border border-[#d3dbe5] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50";
