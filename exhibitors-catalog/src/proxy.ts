/**
 * Next.js "proxy" (в по-старите версии: middleware).
 * Отговаря само за езиковите адреси на публичния сайт.
 * Админ панелът (/admin), API и качените файлове (/uploads) са изключени —
 * защитата на /admin е в src/app/admin/(panel)/layout.tsx и в самите действия.
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!admin|api|uploads|_next|_vercel|sitemap.xml|robots.txt|.*\\..*).*)"],
};
