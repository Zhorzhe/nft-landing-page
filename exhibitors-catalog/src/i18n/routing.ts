/**
 * Езици на публичния сайт. Адресите са /bg/... и /en/...
 * Българският е по подразбиране — "/" пренасочва към "/bg"
 * (или към "/en", ако браузърът на посетителя е на английски).
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["bg", "en"],
  defaultLocale: "bg",
});

export type AppLocale = (typeof routing.locales)[number];
