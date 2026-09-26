/**
 * Изгледът на каталога: търсене, филтри (с броячи), азбучен индекс,
 * резултати и страниране. Използва се от:
 *   - /[locale]/exhibitors              (всички изложители)
 *   - /[locale]/exhibitions/[slug]      (изложителите на едно изложение)
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AutoSubmitForm, FiltersPanel } from "./auto-submit-form";
import { ExhibitorCard } from "./exhibitor-card";
import { SearchIcon } from "@/components/icons";
import { catalogHref, type CatalogFilters, type CatalogResult } from "@/lib/catalog";
import { localName } from "@/lib/i18n-fields";
import { countryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CYRILLIC = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЮЯ".split("");

export async function CatalogView({
  locale,
  filters,
  result,
  basePath,
  fixedExhibition,
}: {
  locale: string;
  filters: CatalogFilters;
  result: CatalogResult;
  basePath: string; // без езика, напр. "/exhibitors"
  fixedExhibition?: boolean; // скрива филтъра "Изложение"
}) {
  const t = await getTranslations("catalog");
  const { facets } = result;
  const action = `/${locale}${basePath}`;
  // На страницата на изложение "exhibition" е част от адреса, не от филтрите.
  const hrefFilters = fixedExhibition ? { ...filters, exhibition: null } : filters;
  const pageHref = (change: Partial<CatalogFilters>) => catalogHref(basePath, hrefFilters, change);

  const activeCount =
    (fixedExhibition ? 0 : filters.exhibition ? 1 : 0) +
    filters.categories.length +
    (filters.country ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.isNew ? 1 : 0);
  const hasAnyFilter = activeCount > 0 || !!filters.q || !!filters.letter;

  const countries = facets.countries
    .map((c) => ({ ...c, name: countryName(c.code, locale) }))
    .sort((a, b) => (a.code === "BG" ? -1 : b.code === "BG" ? 1 : a.name.localeCompare(b.name, locale)));

  const alphabet = locale === "bg" ? [...CYRILLIC, ...LATIN] : [...LATIN, ...CYRILLIC];

  return (
    // key: при смяна на адреса формата се създава наново, за да отразява
    // точно активните филтри (напр. след "Изчисти филтрите").
    <AutoSubmitForm key={catalogHref("", filters)} action={action} className="mx-auto max-w-7xl px-4">
      {/* Търсене */}
      <div className="mx-auto -mt-7 flex max-w-2xl overflow-hidden rounded-full border border-gray-300 bg-white shadow-md focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <label htmlFor="q" className="sr-only">
          {t("searchPlaceholder")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent px-5 py-3 text-base outline-none"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="flex items-center gap-2 bg-accent-500 px-5 font-semibold text-white hover:bg-accent-600">
          <SearchIcon width={20} height={20} />
          <span className="hidden sm:inline">{t("search")}</span>
        </button>
      </div>

      {filters.letter && <input type="hidden" name="letter" value={filters.letter} />}

      {/* Азбучен индекс */}
      <nav aria-label={t("letter")} className="mt-6 flex flex-wrap justify-center gap-1 text-sm">
        <Link
          href={pageHref({ letter: null })}
          scroll={false}
          className={cn(
            "rounded px-2 py-1 font-medium",
            !filters.letter ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-50",
          )}
        >
          {t("all")}
        </Link>
        {alphabet.map((l) =>
          facets.letters.has(l) ? (
            <Link
              key={l}
              href={pageHref({ letter: l })}
              scroll={false}
              className={cn(
                "min-w-7 rounded px-1.5 py-1 text-center font-medium",
                filters.letter === l ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-50",
              )}
            >
              {l}
            </Link>
          ) : null,
        )}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* Филтри */}
        <aside aria-label={t("filters")}>
          <FiltersPanel activeCount={activeCount}>
            <div className="space-y-4 lg:sticky lg:top-4">
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-bold">{t("results", { count: result.total })}</p>
                {hasAnyFilter && (
                  <Link href={basePath} className="text-sm text-brand-600 hover:underline">
                    {t("clear")}
                  </Link>
                )}
              </div>

              {!fixedExhibition && facets.exhibitions.length > 0 && (
                <FilterGroup title={t("exhibition")}>
                  <Option type="radio" name="exhibition" value="" checked={!filters.exhibition} label={t("allExhibitions")} />
                  {facets.exhibitions.map((e) => (
                    <Option
                      key={e.id}
                      type="radio"
                      name="exhibition"
                      value={e.slug}
                      checked={filters.exhibition === e.slug}
                      label={localName(locale, e)}
                      count={e.count}
                    />
                  ))}
                </FilterGroup>
              )}

              {(facets.featuredCount > 0 || facets.newCount > 0 || filters.featured || filters.isNew) && (
                <FilterGroup title={t("features")}>
                  <Option type="checkbox" name="featured" value="1" checked={filters.featured} label={t("featured")} count={facets.featuredCount} />
                  <Option type="checkbox" name="new" value="1" checked={filters.isNew} label={t("newExhibitor")} count={facets.newCount} />
                </FilterGroup>
              )}

              {facets.categories.length > 0 && (
                <FilterGroup title={t("categories")} scroll>
                  {facets.categories.map((c) => {
                    const checked = filters.categories.includes(c.slug);
                    if (!checked && c.count === 0) return null;
                    return (
                      <div key={c.id}>
                        <Option type="checkbox" name="category" value={c.slug} checked={checked} label={localName(locale, c)} count={c.count} />
                        {c.children.some((ch) => ch.count > 0 || filters.categories.includes(ch.slug)) && (
                          <div className="ml-6 border-l border-gray-100 pl-2">
                            {c.children.map((ch) =>
                              ch.count > 0 || filters.categories.includes(ch.slug) ? (
                                <Option
                                  key={ch.id}
                                  type="checkbox"
                                  name="category"
                                  value={ch.slug}
                                  checked={filters.categories.includes(ch.slug)}
                                  label={localName(locale, ch)}
                                  count={ch.count}
                                  small
                                />
                              ) : null,
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </FilterGroup>
              )}

              {countries.length > 0 && (
                <FilterGroup title={t("country")}>
                  <select name="country" defaultValue={filters.country ?? ""} className="input" aria-label={t("country")}>
                    <option value="">{t("allCountries")}</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </select>
                </FilterGroup>
              )}

              <noscript>
                <button type="submit" className="btn-primary w-full">
                  {t("apply")}
                </button>
              </noscript>
            </div>
          </FiltersPanel>
        </aside>

        {/* Резултати */}
        <section aria-live="polite" className="min-w-0 transition-opacity group-data-[pending]:opacity-50">
          {result.items.length === 0 ? (
            <div className="card px-6 py-16 text-center">
              <p className="text-lg font-semibold">{t("noResults")}</p>
              <p className="mt-1 text-gray-600">{t("noResultsHint")}</p>
              {hasAnyFilter && (
                <Link href={basePath} className="btn-secondary mt-4">
                  {t("clear")}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {result.items.map((ex, i) => (
                <ExhibitorCard
                  key={ex.id}
                  ex={ex}
                  locale={locale}
                  featured={ex.featured}
                  exhibitionSlug={filters.exhibition}
                  priority={i < 4}
                />
              ))}
            </div>
          )}

          {result.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
              {result.page > 1 ? (
                <Link href={pageHref({ page: result.page - 1 })} className="btn-secondary" rel="prev">
                  ← {t("prev")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-gray-600">{t("pageOf", { page: result.page, total: result.totalPages })}</span>
              {result.page < result.totalPages ? (
                <Link href={pageHref({ page: result.page + 1 })} className="btn-secondary" rel="next">
                  {t("next")} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </div>
    </AutoSubmitForm>
  );
}

function FilterGroup({ title, children, scroll }: { title: string; children: React.ReactNode; scroll?: boolean }) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
      <legend className="float-left mb-2 w-full text-sm font-bold tracking-wide text-gray-900 uppercase">{title}</legend>
      <div className={cn("clear-both space-y-0.5", scroll && "max-h-96 overflow-y-auto pr-1")}>{children}</div>
    </fieldset>
  );
}

function Option({
  type,
  name,
  value,
  checked,
  label,
  count,
  small,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  label: string;
  count?: number;
  small?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-gray-50", small ? "text-[13px]" : "text-sm")}>
      <input type={type} name={name} value={value} defaultChecked={checked} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
      <span className="flex-1">
        {label}
        {count !== undefined && <span className="ml-1 text-gray-400">({count})</span>}
      </span>
    </label>
  );
}
