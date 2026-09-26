/**
 * Масов импорт на изложители от Excel (.xlsx) или CSV.
 *
 * Процес (вж. src/app/admin/(panel)/import):
 *   1. "Преглед": файлът се чете и валидира, НИЩО не се записва.
 *      Администраторът вижда кои редове ще са нови, кои ще обновят
 *      съществуващ изложител и кои имат грешки.
 *   2. "Импортирай": същият файл се изпраща отново и валидните редове се записват.
 *
 * Правила:
 *   - Съществуващ изложител се разпознава по име на фирмата (без значение
 *     от главни/малки букви). Попълнените в файла полета заместват старите,
 *     празните клетки НЕ изтриват съществуващи данни.
 *   - Категориите се добавят към съществуващите (разделител ";" или "|").
 *   - Участието (щанд/палата) се създава или обновява за избраното изложение.
 *
 * Колоните се разпознават по английски или български заглавия —
 * вж. HEADER_ALIASES. Шаблон: /admin/import/template
 */
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { db } from "./db";
import { exhibitorSchema, fieldErrors } from "./validation";
import { parseCountry } from "./countries";
import { uniqueSlug } from "./slug";
import { fetchRemoteImage, processUpload } from "./images";

export const MAX_ROWS = 5000;

/** Каноничните имена на колоните и приеманите варианти на заглавията. */
export const HEADER_ALIASES: Record<string, string[]> = {
  companyName: ["company_name", "company", "name", "фирма", "име на фирма", "име на фирмата", "изложител", "наименование"],
  companyNameEn: ["company_name_en", "name_en", "име на латиница", "име (en)", "фирма (en)"],
  descriptionBg: ["description_bg", "description", "описание", "описание (bg)", "описание bg"],
  descriptionEn: ["description_en", "описание (en)", "описание en"],
  country: ["country", "държава", "страна"],
  city: ["city", "град"],
  address: ["address", "адрес"],
  website: ["website", "web", "url", "уебсайт", "сайт", "интернет страница"],
  email: ["email", "e-mail", "имейл", "ел. поща", "електронна поща"],
  phone: ["phone", "tel", "telephone", "телефон", "тел"],
  facebook: ["facebook"],
  instagram: ["instagram"],
  linkedin: ["linkedin"],
  youtube: ["youtube"],
  x: ["x", "twitter"],
  categories: ["categories", "category", "категории", "категория", "бранш", "браншове", "сектор"],
  exhibition: ["exhibition", "изложение", "събитие"],
  boothNumber: ["booth_number", "booth", "stand", "щанд", "номер на щанд"],
  hall: ["hall", "палата", "зала"],
  isNewExhibitor: ["is_new", "new", "нов", "нов изложител"],
  isFeatured: ["is_featured", "featured", "акцент"],
  logoUrl: ["logo_url", "logo", "лого"],
};

/** Реда на колоните в шаблона. */
export const TEMPLATE_COLUMNS = [
  "company_name",
  "company_name_en",
  "description_bg",
  "description_en",
  "country",
  "city",
  "address",
  "website",
  "email",
  "phone",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "x",
  "categories",
  "exhibition",
  "booth_number",
  "hall",
  "is_new",
  "is_featured",
  "logo_url",
];

/** Български имена на полетата за съобщенията за грешки. */
const FIELD_LABELS: Record<string, string> = {
  companyName: "Име на фирма",
  companyNameEn: "Име (EN)",
  descriptionBg: "Описание (BG)",
  descriptionEn: "Описание (EN)",
  country: "Държава",
  city: "Град",
  address: "Адрес",
  website: "Уебсайт",
  email: "Имейл",
  phone: "Телефон",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const ALIAS_LOOKUP = new Map<string, string>();
for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
  ALIAS_LOOKUP.set(norm(key), key);
  for (const a of aliases) ALIAS_LOOKUP.set(norm(a), key);
}

type RawRow = Record<string, string>;

/** Стойност от клетка на Excel -> текст (обработва линкове, формули, rich text). */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("hyperlink" in value) return String(value.text ?? value.hyperlink ?? "");
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String((value as { text: unknown }).text ?? "");
    return "";
  }
  return String(value);
}

/** CSV може да е записан в UTF-8 или Windows-1251 (стари експорти от Excel). */
function decodeCsv(buf: Buffer): string {
  const utf8 = buf.toString("utf8").replace(/^﻿/, "");
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1251").decode(buf);
}

/** Чете файла и връща редове с канонични имена на колоните. */
export async function readSpreadsheet(
  buf: Buffer,
  filename: string,
): Promise<{ rows: RawRow[]; unknownHeaders: string[] }> {
  let table: string[][];
  if (/\.csv$|\.txt$/i.test(filename)) {
    const parsed = Papa.parse<string[]>(decodeCsv(buf), { skipEmptyLines: "greedy" });
    table = parsed.data;
  } else if (/\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("Файлът няма работни листове.");
    table = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(row.getCell(c).value));
      table.push(cells);
    });
  } else {
    throw new Error("Поддържани формати: .xlsx и .csv (старият .xls формат — запишете го като .xlsx).");
  }

  if (table.length < 2) throw new Error("Файлът е празен или има само заглавен ред.");
  const headers = table[0].map((h) => ALIAS_LOOKUP.get(norm(String(h ?? ""))) ?? null);
  const unknownHeaders = table[0].filter((h, i) => String(h).trim() && !headers[i]).map(String);
  if (!headers.includes("companyName"))
    throw new Error('Липсва колона с името на фирмата ("company_name" или "Име на фирма").');

  const rows = table
    .slice(1)
    .map((cells) => {
      const row: RawRow = {};
      headers.forEach((key, i) => {
        if (key) row[key] = String(cells[i] ?? "").trim();
      });
      return row;
    })
    .filter((r) => Object.values(r).some(Boolean));

  if (rows.length > MAX_ROWS) throw new Error(`Максимум ${MAX_ROWS} реда на един импорт.`);
  return { rows, unknownHeaders };
}

const truthy = (v: string | undefined) => /^(1|да|yes|y|true|x|✓|✔)$/i.test((v ?? "").trim());
const splitList = (v: string | undefined) =>
  (v ?? "")
    .split(/[;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

export type ImportOptions = {
  defaultExhibitionId: string | null;
  createMissingCategories: boolean;
  updateExisting: boolean;
};

export type PreviewRow = {
  line: number; // номер на реда във файла (1 = заглавия)
  companyName: string;
  action: "create" | "update" | "skip" | "error";
  errors: string[];
  warnings: string[];
  booth: string | null;
  exhibition: string | null;
  categories: string[];
};

type PreparedRow = PreviewRow & {
  data?: ReturnType<typeof exhibitorSchema.parse>;
  existingId?: string;
  exhibitionId?: string | null;
  categoryIds: string[];
  newCategoryNames: string[];
  hall: string | null;
  isNewExhibitor: boolean;
  isFeatured: boolean;
  logoUrl: string | null;
};

/** Валидира всички редове спрямо текущото съдържание на базата. */
async function prepare(rows: RawRow[], opts: ImportOptions): Promise<PreparedRow[]> {
  const [exhibitors, categories, exhibitions] = await Promise.all([
    db.exhibitor.findMany({ select: { id: true, companyName: true, companyNameEn: true } }),
    db.category.findMany({ select: { id: true, slug: true, nameBg: true, nameEn: true } }),
    db.exhibition.findMany({ select: { id: true, slug: true, nameBg: true, nameEn: true } }),
  ]);

  const byName = new Map<string, string>();
  for (const e of exhibitors) {
    byName.set(norm(e.companyName), e.id);
    if (e.companyNameEn) byName.set(norm(e.companyNameEn), e.id);
  }
  const catLookup = new Map<string, string>();
  for (const c of categories) {
    for (const k of [c.slug, c.nameBg, c.nameEn]) if (k) catLookup.set(norm(k), c.id);
  }
  const exLookup = new Map<string, { id: string; name: string }>();
  for (const e of exhibitions) {
    for (const k of [e.id, e.slug, e.nameBg, e.nameEn]) if (k) exLookup.set(norm(k), { id: e.id, name: e.nameBg });
  }
  const defaultEx = exhibitions.find((e) => e.id === opts.defaultExhibitionId);

  const seen = new Set<string>();
  return rows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const countryRaw = row.country ?? "";
    const country = parseCountry(countryRaw);
    if (countryRaw && !country) warnings.push(`Непозната държава „${countryRaw}“ — пропусната.`);

    const parsed = exhibitorSchema.safeParse({
      companyName: row.companyName ?? "",
      companyNameEn: row.companyNameEn ?? "",
      descriptionBg: row.descriptionBg ?? "",
      descriptionEn: row.descriptionEn ?? "",
      country: country ?? "",
      city: row.city ?? "",
      address: row.address ?? "",
      website: row.website ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      facebook: row.facebook ?? "",
      instagram: row.instagram ?? "",
      linkedin: row.linkedin ?? "",
      youtube: row.youtube ?? "",
      x: row.x ?? "",
      isPublished: true,
    });
    if (!parsed.success) {
      for (const [field, msg] of Object.entries(fieldErrors(parsed.error)))
        errors.push(`${FIELD_LABELS[field] ?? field}: ${msg}`);
    }

    const name = row.companyName ?? "";
    const key = norm(name);
    if (key && seen.has(key)) errors.push("Фирмата се повтаря по-горе във файла.");
    seen.add(key);
    const existingId = byName.get(key) ?? (row.companyNameEn ? byName.get(norm(row.companyNameEn)) : undefined);

    // Изложение: от колоната или избраното по подразбиране
    let exhibitionId: string | null = null;
    let exhibitionName: string | null = null;
    if (row.exhibition) {
      const ex = exLookup.get(norm(row.exhibition));
      if (ex) {
        exhibitionId = ex.id;
        exhibitionName = ex.name;
      } else warnings.push(`Непознато изложение „${row.exhibition}“ — участието е пропуснато.`);
    } else if (defaultEx) {
      exhibitionId = defaultEx.id;
      exhibitionName = defaultEx.nameBg;
    }
    if (!exhibitionId && (row.boothNumber || row.hall)) warnings.push("Има щанд, но не е избрано изложение.");

    // Категории
    const categoryIds: string[] = [];
    const newCategoryNames: string[] = [];
    const catNames = splitList(row.categories);
    for (const c of catNames) {
      const id = catLookup.get(norm(c));
      if (id) categoryIds.push(id);
      else if (opts.createMissingCategories) newCategoryNames.push(c);
      else warnings.push(`Непозната категория „${c}“ — пропусната.`);
    }

    let action: PreviewRow["action"] = existingId ? "update" : "create";
    if (errors.length) action = "error";
    else if (existingId && !opts.updateExisting) {
      action = "skip";
      warnings.push("Изложителят вече съществува — пропуснат (обновяването е изключено).");
    }

    return {
      line: i + 2,
      companyName: name,
      action,
      errors,
      warnings,
      booth: row.boothNumber || null,
      exhibition: exhibitionName,
      categories: catNames,
      data: parsed.success ? parsed.data : undefined,
      existingId,
      exhibitionId,
      categoryIds,
      newCategoryNames,
      hall: row.hall || null,
      isNewExhibitor: truthy(row.isNewExhibitor),
      isFeatured: truthy(row.isFeatured),
      logoUrl: row.logoUrl || null,
    };
  });
}

/** Стъпка 1: само преглед, без запис. */
export async function previewImport(rows: RawRow[], opts: ImportOptions): Promise<PreviewRow[]> {
  const prepared = await prepare(rows, opts);
  return prepared.map((r) => ({
    line: r.line,
    companyName: r.companyName,
    action: r.action,
    errors: r.errors,
    warnings: r.warnings,
    booth: r.booth,
    exhibition: r.exhibition,
    categories: r.categories,
  }));
}

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  failed: { line: number; companyName: string; error: string }[];
  logoErrors: number;
};

/** Стъпка 2: запис на валидните редове. */
export async function commitImport(rows: RawRow[], opts: ImportOptions): Promise<ImportSummary> {
  const prepared = await prepare(rows, opts);
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, failed: [], logoErrors: 0 };

  // Липсващите категории се създават веднъж, преди изложителите.
  const newCats = new Map<string, string>();
  if (opts.createMissingCategories) {
    for (const r of prepared) {
      if (r.action === "error" || r.action === "skip") continue;
      for (const name of r.newCategoryNames) {
        const k = norm(name);
        if (newCats.has(k)) continue;
        const slug = await uniqueSlug(name, async (s) => Boolean(await db.category.findUnique({ where: { slug: s } })));
        const cat = await db.category.create({ data: { nameBg: name, slug } });
        newCats.set(k, cat.id);
      }
    }
  }

  const logoJobs: { exhibitorId: string; url: string }[] = [];

  for (const r of prepared) {
    if (r.action === "error") {
      summary.failed.push({ line: r.line, companyName: r.companyName, error: r.errors.join("; ") });
      continue;
    }
    if (r.action === "skip" || !r.data) {
      summary.skipped++;
      continue;
    }
    const categoryIds = [...r.categoryIds, ...r.newCategoryNames.map((n) => newCats.get(norm(n))!).filter(Boolean)];
    try {
      const id = await db.$transaction(async (tx) => {
        let exhibitorId: string;
        if (r.existingId) {
          // Обновяваме само попълнените полета — празните клетки не трият данни.
          // isPublished не се пипа — ако фирмата е скрита ръчно, остава скрита.
          const patch = Object.fromEntries(
            Object.entries(r.data!).filter(([k, v]) => k !== "isPublished" && v !== null && v !== ""),
          );
          await tx.exhibitor.update({ where: { id: r.existingId }, data: patch });
          exhibitorId = r.existingId;
        } else {
          const slug = await uniqueSlug(r.data!.companyNameEn || r.data!.companyName, async (s) =>
            Boolean(await tx.exhibitor.findUnique({ where: { slug: s }, select: { id: true } })),
          );
          const created = await tx.exhibitor.create({ data: { ...r.data!, slug } });
          exhibitorId = created.id;
        }
        if (categoryIds.length)
          await tx.exhibitorCategory.createMany({
            data: categoryIds.map((categoryId) => ({ exhibitorId, categoryId })),
            skipDuplicates: true,
          });
        if (r.exhibitionId) {
          const p = {
            boothNumber: r.booth,
            hall: r.hall,
            isNewExhibitor: r.isNewExhibitor,
            isFeatured: r.isFeatured,
          };
          await tx.participation.upsert({
            where: { exhibitorId_exhibitionId: { exhibitorId, exhibitionId: r.exhibitionId } },
            create: { exhibitorId, exhibitionId: r.exhibitionId, ...p },
            update: p,
          });
        }
        return exhibitorId;
      });
      if (r.existingId) summary.updated++;
      else summary.created++;
      if (r.logoUrl) logoJobs.push({ exhibitorId: id, url: r.logoUrl });
    } catch (e) {
      summary.failed.push({ line: r.line, companyName: r.companyName, error: (e as Error).message.slice(0, 200) });
    }
  }

  // Лога от адреси: изтегляме по 5 едновременно; грешките не спират импорта.
  const queue = [...logoJobs];
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const current = await db.exhibitor.findUnique({ where: { id: job.exhibitorId }, select: { logo: true } });
          if (current?.logo) continue; // не заменяме вече качено лого
          const url = await processUpload(await fetchRemoteImage(job.url), "logos");
          await db.exhibitor.update({ where: { id: job.exhibitorId }, data: { logo: url } });
        } catch {
          summary.logoErrors++;
        }
      }
    }),
  );

  return summary;
}
