import { clsx, type ClassValue } from "clsx";

/** Обединява CSS класове (Tailwind) с условия. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Добавя https:// към адрес, въведен без протокол ("www.firma.bg"). */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Показва адреса без протокол и наклонена черта накрая: "www.firma.bg". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Формат на период: "28.09 – 02.10.2026" / "Sep 28 – Oct 2, 2026". */
export function formatDateRange(start: Date, end: Date, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return fmt.formatRange(start, end);
}

/** Първата буква на името за азбучния индекс (кирилица или латиница). */
export function firstLetter(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  return /[A-ZА-Я]/.test(ch) ? ch : "#";
}

export const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
