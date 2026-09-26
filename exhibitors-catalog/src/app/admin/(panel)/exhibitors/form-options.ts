import { db } from "@/lib/db";
import { COUNTRY_CODES, countryName } from "@/lib/countries";

/** Данните за падащите менюта и чекбоксовете във формата за изложител. */
export async function getExhibitorFormOptions() {
  const [exhibitions, categories] = await Promise.all([
    db.exhibition.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      select: { id: true, nameBg: true, status: true },
    }),
    db.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }],
      select: {
        id: true,
        nameBg: true,
        children: { orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }], select: { id: true, nameBg: true } },
      },
    }),
  ]);
  const countries = COUNTRY_CODES.map((code) => ({ code, name: countryName(code, "bg") })).sort((a, b) =>
    a.name.localeCompare(b.name, "bg"),
  );
  return { exhibitions, categories, countries };
}
