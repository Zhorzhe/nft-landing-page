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
      className="rounded-full border border-white/30 px-3 py-1 text-sm font-medium text-white hover:bg-white/10"
    >
      {t("switchLanguage")}
    </Link>
  );
}
