"use client";

/** Превключва bg <-> en, като запазва текущата страница и филтрите. */
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const search = useSearchParams();
  const other = locale === "bg" ? "en" : "bg";
  const qs = search.toString();
  return (
    <Link
      href={qs ? `${pathname}?${qs}` : pathname}
      locale={other}
      hrefLang={other}
      aria-label={t("switchLanguageLabel")}
      className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-brand-600 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
    >
      <span aria-hidden className="text-xs font-bold tracking-wider text-accent-600 uppercase">
        {other}
      </span>
      <span className="hidden sm:inline">{t("switchLanguage")}</span>
    </Link>
  );
}
