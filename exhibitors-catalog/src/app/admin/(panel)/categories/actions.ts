"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { uniqueSlug, slugify } from "@/lib/slug";
import { categorySchema, fieldErrors, text } from "@/lib/validation";
import type { FormState } from "@/components/admin/form-state";

export async function saveCategory(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const parsed = categorySchema.safeParse({
    nameBg: text(fd, "nameBg"),
    nameEn: text(fd, "nameEn"),
    slug: text(fd, "slug"),
    sortOrder: text(fd, "sortOrder") || "0",
    parentId: text(fd, "parentId"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Моля, поправете отбелязаните полета." };
  const data = parsed.data;

  // Поддържаме само две нива: категория -> подкатегория.
  if (data.parentId) {
    if (data.parentId === id) return { errors: { parentId: "Категорията не може да е родител на себе си." } };
    const parent = await db.category.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
    if (!parent || parent.parentId) return { errors: { parentId: "Изберете основна категория (без родител)." } };
    if (id && (await db.category.count({ where: { parentId: id } })) > 0)
      return { errors: { parentId: "Тази категория има подкатегории и не може да стане подкатегория." } };
  }

  const slug = await uniqueSlug(data.slug ? slugify(data.slug) : data.nameEn || data.nameBg, async (s) =>
    Boolean(await db.category.findFirst({ where: { slug: s, NOT: id ? { id } : undefined }, select: { id: true } })),
  );
  const record = { ...data, slug };
  const saved = id
    ? await db.category.update({ where: { id }, data: record })
    : await db.category.create({ data: record });

  await audit(user.id, id ? "update" : "create", "Category", saved.id, saved.nameBg);
  revalidatePath("/", "layout");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(id: string): Promise<void> {
  const user = await requireAdmin();
  // Изложителите остават; само връзката с категорията се премахва.
  // Подкатегориите стават основни (onDelete: SetNull).
  const cat = await db.category.delete({ where: { id } }).catch(() => null);
  if (cat) await audit(user.id, "delete", "Category", id, cat.nameBg);
  revalidatePath("/", "layout");
  redirect("/admin/categories?deleted=1");
}
