/**
 * Помощни функции за двуезичните полета в базата (nameBg / nameEn и т.н.).
 * Ако английската стойност липсва, се връща българската — така сайтът
 * никога не показва празни места, докато преводите се допълват.
 */
export type Locale = "bg" | "en";

export function pick(
  locale: string,
  bg: string | null | undefined,
  en: string | null | undefined,
): string {
  if (locale === "en") return (en || bg || "").trim();
  return (bg || en || "").trim();
}

/** Име на изложение/категория според езика. */
export function localName(locale: string, item: { nameBg: string; nameEn: string | null }) {
  return pick(locale, item.nameBg, item.nameEn);
}

/** Име на фирма: на английски показваме латинското име, ако има такова. */
export function companyName(
  locale: string,
  item: { companyName: string; companyNameEn: string | null },
) {
  return locale === "en" && item.companyNameEn ? item.companyNameEn : item.companyName;
}

/** Описание според езика. */
export function localDescription(
  locale: string,
  item: { descriptionBg: string | null; descriptionEn: string | null },
) {
  return pick(locale, item.descriptionBg, item.descriptionEn);
}
