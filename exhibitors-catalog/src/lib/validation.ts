/**
 * Схеми за валидиране на данните от админ формите и от импорта (zod).
 * Една и съща схема се ползва и от формата, и от импорта, за да са
 * правилата винаги еднакви.
 */
import { z } from "zod";
import { normalizeUrl } from "./utils";

/** Празен низ -> null; иначе подрязан текст. */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Максимум ${max} символа`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => normalizeUrl(v))
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Невалиден уеб адрес")
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Невалиден имейл")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const exhibitorSchema = z.object({
  companyName: z.string().trim().min(2, "Въведете име на фирмата").max(200),
  companyNameEn: optionalText(200),
  slug: optionalText(80),
  descriptionBg: optionalText(5000),
  descriptionEn: optionalText(5000),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Невалиден код на държава")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  city: optionalText(100),
  address: optionalText(300),
  website: optionalUrl,
  email: optionalEmail,
  phone: optionalText(100),
  facebook: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  x: optionalUrl,
  isPublished: z.boolean(),
});
export type ExhibitorInput = z.infer<typeof exhibitorSchema>;

export const participationSchema = z.object({
  exhibitionId: z.string().min(1),
  boothNumber: optionalText(50),
  hall: optionalText(100),
  isFeatured: z.boolean().default(false),
  isNewExhibitor: z.boolean().default(false),
});
export type ParticipationInput = z.infer<typeof participationSchema>;

export const exhibitionSchema = z
  .object({
    nameBg: z.string().trim().min(2, "Въведете име").max(200),
    nameEn: optionalText(200),
    slug: optionalText(80),
    descriptionBg: optionalText(5000),
    descriptionEn: optionalText(5000),
    startDate: z.coerce.date({ message: "Невалидна дата" }),
    endDate: z.coerce.date({ message: "Невалидна дата" }),
    venue: optionalText(200),
    website: optionalUrl,
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Крайната дата е преди началната",
    path: ["endDate"],
  });

export const categorySchema = z.object({
  nameBg: z.string().trim().min(2, "Въведете име").max(150),
  nameEn: optionalText(150),
  slug: optionalText(80),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  parentId: optionalText(50),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Въведете име").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Невалиден имейл")),
  role: z.enum(["ADMIN", "EDITOR"]),
  isActive: z.boolean(),
  password: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || v.length >= 10, "Паролата трябва да е поне 10 символа"),
});

/** Превръща грешките на zod в обект { поле: "съобщение" } за формите. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Чете чекбокс от FormData. */
export const checkbox = (fd: FormData, name: string) => fd.get(name) === "on";

/** Чете текстово поле от FormData ("" ако липсва). */
export const text = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};
