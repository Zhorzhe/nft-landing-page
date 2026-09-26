import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="bg-brand-800 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white text-sm font-black tracking-tight text-brand-800">
            IFP
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] tracking-widest text-brand-200 uppercase">{t("org")}</span>
            <span className="block font-bold group-hover:underline">{t("siteName")}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/exhibitors" className="rounded px-2 py-1 font-medium hover:bg-white/10">
            {t("nav.exhibitors")}
          </Link>
          <Link href="/exhibitions" className="rounded px-2 py-1 font-medium hover:bg-white/10">
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
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-gray-600 sm:flex-row sm:justify-between">
        <p>{t("footer", { year: new Date().getFullYear() })}</p>
        <p>{t("footerAddress")}</p>
      </div>
    </footer>
  );
}
