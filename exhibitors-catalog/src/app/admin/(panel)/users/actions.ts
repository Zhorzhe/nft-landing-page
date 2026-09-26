"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { userSchema, fieldErrors, checkbox, text } from "@/lib/validation";
import type { FormState } from "@/components/admin/form-state";

export async function saveUser(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = userSchema.safeParse({
    name: text(fd, "name"),
    email: text(fd, "email"),
    role: text(fd, "role"),
    isActive: checkbox(fd, "isActive"),
    password: text(fd, "password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Моля, поправете отбелязаните полета." };
  const { password, ...data } = parsed.data;

  if (!id && !password) return { errors: { password: "Задайте парола за новия потребител." } };

  const clash = await db.user.findFirst({ where: { email: data.email, NOT: id ? { id } : undefined } });
  if (clash) return { errors: { email: "Вече има потребител с този имейл." } };

  // Защита: винаги да остане поне един активен администратор.
  if (id && (data.role !== "ADMIN" || !data.isActive)) {
    const otherAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id } } });
    if (otherAdmins === 0) return { message: "Трябва да остане поне един активен администратор." };
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  const saved = id
    ? await db.user.update({ where: { id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } })
    : await db.user.create({ data: { ...data, passwordHash: passwordHash! } });

  await audit(me.id, id ? "update" : "create", "User", saved.id, saved.email);
  redirect("/admin/users?saved=1");
}
