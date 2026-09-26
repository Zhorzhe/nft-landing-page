/**
 * Държави: в базата пазим двубуквения ISO код ("BG", "DE"),
 * а името се показва на езика на потребителя чрез вградения Intl API —
 * не е нужна отделна таблица с преводи.
 */
const cache = new Map<string, Intl.DisplayNames>();

export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  let dn = cache.get(locale);
  if (!dn) {
    dn = new Intl.DisplayNames([locale], { type: "region" });
    cache.set(locale, dn);
  }
  try {
    return dn.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * Кодове, които Intl познава, но не са текущи държави: остарели
 * (ГДР, СССР, Югославия, Заир…), организации (EU, UN) и служебни (XA, ZZ).
 */
const EXCLUDED = new Set([
  "AN", "BU", "CS", "DD", "DY", "FX", "HV", "NH", "RH", "SU", "TP", "UK", "VD", "YD", "YU", "ZR",
  "EU", "EZ", "QO", "UN", "XA", "XB", "ZZ",
]);

/** Всички ISO кодове на държави (за падащото меню в админ панела). */
export const COUNTRY_CODES: string[] = (() => {
  const codes: string[] = [];
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (EXCLUDED.has(code)) continue;
      try {
        const name = dn.of(code);
        if (name && name !== code) codes.push(code);
      } catch {
        /* невалиден код */
      }
    }
  return codes;
})();

/**
 * Опитва да разпознае държава от свободен текст при импорт
 * ("Bulgaria", "България", "BG") и връща ISO кода или null.
 */
export function parseCountry(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (/^[A-Za-z]{2}$/.test(value)) {
    const code = value.toUpperCase() === "UK" ? "GB" : value.toUpperCase();
    return COUNTRY_CODES.includes(code) ? code : null;
  }
  const needle = value.toLowerCase();
  for (const locale of ["bg", "en"]) {
    for (const code of COUNTRY_CODES) {
      if (countryName(code, locale).toLowerCase() === needle) return code;
    }
  }
  return null;
}
