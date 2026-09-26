/**
 * Хедър и футър на публичния сайт — в стила на онлайн формулярите на МПП:
 * бял хедър с логото на панаира и синя лента отдолу.
 * Логото е в public/ifp-logo.png (за смяна — заменете файла).
 */
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

function IfpLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ifp-logo.png"
      alt="Международен панаир Пловдив · International Fair Plovdiv"
      width={715}
      height={87}
      className={className}
    />
  );
}

export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="border-b-4 border-brand-600 bg-white">
      <div className="mx-auto flex min-h-[72px] max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-4" aria-label={t("siteName")}>
          <IfpLogo className="h-8 w-auto sm:h-10" />
          <span className="hidden border-l-2 border-accent-500 pl-4 text-[15px] leading-tight font-bold text-brand-800 lg:block">
            {t("siteName")}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[15px] sm:gap-2">
          <Link href="/exhibitors" className="rounded-md px-3 py-2 font-semibold text-brand-700 hover:bg-brand-50">
            {t("nav.exhibitors")}
          </Link>
          <Link href="/exhibitions" className="rounded-md px-3 py-2 font-semibold text-brand-700 hover:bg-brand-50">
            {t("nav.exhibitions")}
          </Link>
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("common");
  return (
    <footer className="mt-16 border-t-4 border-brand-600 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-[auto_1fr] sm:items-center">
        <a href="https://www.fair.bg" className="block" target="_blank" rel="noopener">
          <IfpLogo className="h-9 w-auto" />
        </a>
        <div className="space-y-1 sm:text-right">
          <p className="font-semibold text-ink">{t("siteName")}</p>
          <p>{t("footerAddress")}</p>
          <p>{t("footer", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
