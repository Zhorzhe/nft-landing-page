"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { uniqueSlug, slugify } from "@/lib/slug";
import { processUpload, hasFile, ImageError } from "@/lib/images";
import { deleteFile } from "@/lib/storage";
import { exhibitionSchema, fieldErrors, checkbox, text } from "@/lib/validation";
import type { FormState } from "@/components/admin/form-state";

export async function saveExhibition(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const parsed = exhibitionSchema.safeParse({
    nameBg: text(fd, "nameBg"),
    nameEn: text(fd, "nameEn"),
    slug: text(fd, "slug"),
    descriptionBg: text(fd, "descriptionBg"),
    descriptionEn: text(fd, "descriptionEn"),
    startDate: text(fd, "startDate"),
    endDate: text(fd, "endDate"),
    venue: text(fd, "venue"),
    website: text(fd, "website"),
    status: text(fd, "status"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Моля, поправете отбелязаните полета." };
  const data = parsed.data;

  const slug = await uniqueSlug(data.slug ? slugify(data.slug) : data.nameEn || data.nameBg, async (s) =>
    Boolean(await db.exhibition.findFirst({ where: { slug: s, NOT: id ? { id } : undefined }, select: { id: true } })),
  );

  const existing = id ? await db.exhibition.findUnique({ where: { id }, select: { logo: true } }) : null;
  if (id && !existing) return { message: "Изложението не е намерено." };
  let logo = existing?.logo ?? null;
  const oldLogo = logo;
  const file = fd.get("logo");
  try {
    if (hasFile(file)) logo = await processUpload(file, "exhibitions");
    else if (checkbox(fd, "removeLogo")) logo = null;
  } catch (e) {
    if (e instanceof ImageError) return { errors: { logo: e.message }, message: e.message };
    throw e;
  }

  const record = { ...data, slug, logo };
  const saved = id
    ? await db.exhibition.update({ where: { id }, data: record })
    : await db.exhibition.create({ data: record });
  if (oldLogo && oldLogo !== logo) await deleteFile(oldLogo);

  await audit(user.id, id ? "update" : "create", "Exhibition", saved.id, saved.nameBg);
  revalidatePath("/", "layout");
  redirect(`/admin/exhibitions/${saved.id}?saved=1`);
}

export async function deleteExhibition(id: string): Promise<void> {
  const user = await requireAdmin();
  // Изтриването премахва и участията (щандовете), но НЕ и самите изложители.
  const ex = await db.exhibition.delete({ where: { id } }).catch(() => null);
  if (ex) {
    await deleteFile(ex.logo);
    await audit(user.id, "delete", "Exhibition", id, ex.nameBg);
  }
  revalidatePath("/", "layout");
  redirect("/admin/exhibitions?deleted=1");
}
