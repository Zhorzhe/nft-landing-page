/**
 * SEO помощни функции: canonical адрес и hreflang връзки между
 * българската и английската версия на всяка страница.
 */
import type { Metadata } from "next";

export function alternates(path: string, locale: string): Metadata["alternates"] {
  const p = path === "/" ? "" : path;
  return {
    canonical: `/${locale}${p}`,
    languages: { bg: `/bg${p}`, en: `/en${p}`, "x-default": `/bg${p}` },
  };
}

/** Съкращава текст за meta description (~160 символа). */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}
