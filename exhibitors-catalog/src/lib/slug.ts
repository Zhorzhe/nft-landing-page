/**
 * Генериране на URL "slug" от имена на кирилица или латиница.
 * Транслитерацията следва официалната българска система (Закон за
 * транслитерацията), напр. "Агро Щит ООД" -> "agro-shtit-ood".
 */
const BG_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht",
  ъ: "a", ь: "y", ю: "yu", я: "ya",
};

export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => BG_TO_LATIN[ch] ?? ch)
    .join("");
}

export function slugify(input: string): string {
  return (
    transliterate(input)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // премахва диакритиката (é -> e)
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

/**
 * Връща slug, който все още не е зает. `exists` проверява в базата.
 * При конфликт добавя -2, -3 и т.н.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; await exists(candidate); i++) candidate = `${root}-${i}`;
  return candidate;
}
