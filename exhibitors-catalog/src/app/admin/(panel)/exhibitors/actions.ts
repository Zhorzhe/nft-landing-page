"use server";

/**
 * Server Actions за изложителите: запис (нов/редакция) и изтриване.
 * Всяко действие проверява правата самостоятелно.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { uniqueSlug, slugify } from "@/lib/slug";
import { processUpload, hasFile, ImageError } from "@/lib/images";
import { deleteFile } from "@/lib/storage";
import {
  exhibitorSchema,
  participationSchema,
  fieldErrors,
  checkbox,
  text,
} from "@/lib/validation";
import type { FormState } from "@/components/admin/form-state";

export async function saveExhibitor(
  id: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();

  // 1. Основни полета
  const parsed = exhibitorSchema.safeParse({
    companyName: text(fd, "companyName"),
    companyNameEn: text(fd, "companyNameEn"),
    slug: text(fd, "slug"),
    descriptionBg: text(fd, "descriptionBg"),
    descriptionEn: text(fd, "descriptionEn"),
    country: text(fd, "country"),
    city: text(fd, "city"),
    address: text(fd, "address"),
    website: text(fd, "website"),
    email: text(fd, "email"),
    phone: text(fd, "phone"),
    facebook: text(fd, "facebook"),
    instagram: text(fd, "instagram"),
    linkedin: text(fd, "linkedin"),
    youtube: text(fd, "youtube"),
    x: text(fd, "x"),
    isPublished: checkbox(fd, "isPublished"),
  });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Моля, поправете отбелязаните полета." };
  }
  const data = parsed.data;

  // 2. Участия в изложения (идват като JSON от редактора на участия)
  let participations: z.infer<typeof participationSchema>[] = [];
  try {
    const raw = JSON.parse(text(fd, "participations") || "[]");
    participations = z.array(participationSchema).parse(raw);
  } catch {
    return { message: "Невалидни данни за участията." };
  }
  const exhibitionIds = participations.map((p) => p.exhibitionId);
  if (new Set(exhibitionIds).size !== exhibitionIds.length) {
    return { errors: { participations: "Едно изложение е добавено два пъти." }, message: "Едно изложение е добавено два пъти." };
  }

  // 3. Категории
  const categoryIds = fd.getAll("categoryIds").filter((v): v is string => typeof v === "string");

  // 4. Уникален slug (адрес на страницата)
  const slugBase = data.slug ? slugify(data.slug) : data.companyNameEn || data.companyName;
  const slug = await uniqueSlug(slugBase, async (s) =>
    Boolean(await db.exhibitor.findFirst({ where: { slug: s, NOT: id ? { id } : undefined }, select: { id: true } })),
  );

  // 5. Лого (оптимизира се автоматично)
  const existing = id ? await db.exhibitor.findUnique({ where: { id }, select: { logo: true } }) : null;
  if (id && !existing) return { message: "Изложителят не е намерен." };
  let logo = existing?.logo ?? null;
  const oldLogo = logo;
  const file = fd.get("logo");
  try {
    if (hasFile(file)) logo = await processUpload(file, "logos");
    else if (checkbox(fd, "removeLogo")) logo = null;
  } catch (e) {
    if (e instanceof ImageError) return { errors: { logo: e.message }, message: e.message };
    throw e;
  }

  // 6. Запис в една транзакция
  const record = { ...data, slug, logo };
  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      const ex = id
        ? await tx.exhibitor.update({ where: { id }, data: record })
        : await tx.exhibitor.create({ data: record });
      await tx.exhibitorCategory.deleteMany({ where: { exhibitorId: ex.id } });
      if (categoryIds.length)
        await tx.exhibitorCategory.createMany({
          data: categoryIds.map((categoryId) => ({ exhibitorId: ex.id, categoryId })),
        });
      await tx.participation.deleteMany({ where: { exhibitorId: ex.id } });
      if (participations.length)
        await tx.participation.createMany({
          data: participations.map((p) => ({ ...p, exhibitorId: ex.id })),
        });
      return ex.id;
    });
  } catch (e) {
    if (logo && logo !== oldLogo) await deleteFile(logo); // почистваме новокачения файл
    throw e;
  }

  if (oldLogo && oldLogo !== logo) await deleteFile(oldLogo);
  await audit(user.id, id ? "update" : "create", "Exhibitor", savedId, data.companyName);
  revalidatePath("/", "layout");
  redirect(`/admin/exhibitors/${savedId}?saved=1`);
}

export async function deleteExhibitor(id: string): Promise<void> {
  const user = await requireUser();
  if (!can.deleteExhibitor(user)) redirect("/admin?denied=1");
  const ex = await db.exhibitor.delete({ where: { id } }).catch(() => null);
  if (ex) {
    await deleteFile(ex.logo);
    await audit(user.id, "delete", "Exhibitor", id, ex.companyName);
  }
  revalidatePath("/", "layout");
  redirect("/admin/exhibitors?deleted=1");
}

/** Бързо публикуване/скриване от списъка. */
export async function togglePublished(id: string): Promise<void> {
  const user = await requireUser();
  const ex = await db.exhibitor.findUnique({ where: { id }, select: { isPublished: true, companyName: true } });
  if (!ex) return;
  await db.exhibitor.update({ where: { id }, data: { isPublished: !ex.isPublished } });
  await audit(user.id, "update", "Exhibitor", id, `${ex.companyName} (${ex.isPublished ? "скрит" : "публикуван"})`);
  revalidatePath("/", "layout");
}
