/**
 * Проверка на правата в админ панела.
 *
 * Използвай requireUser() / requireAdmin() в НАЧАЛОТО на всяка админ
 * страница и всеки Server Action. Не разчитай само на скриването на бутони
 * в интерфейса — Server Actions могат да се извикат и директно.
 *
 * Матрица на правата:
 *   ADMIN  — всичко
 *   EDITOR — изложители (създаване/редакция), участия, импорт;
 *            преглед на изложения и категории;
 *            БЕЗ изтриване на изложители, изложения, категории;
 *            БЕЗ управление на потребители.
 */
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export type CurrentUser = { id: string; name: string; email: string; role: "ADMIN" | "EDITOR" };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Винаги проверяваме в базата — ролята или активността може да са сменени.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Изисква вписан потребител; иначе пренасочва към вход. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Изисква роля ADMIN; редакторите се връщат към таблото. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/admin?denied=1");
  return user;
}

export const can = {
  deleteExhibitor: (u: CurrentUser) => u.role === "ADMIN",
  manageExhibitions: (u: CurrentUser) => u.role === "ADMIN",
  manageCategories: (u: CurrentUser) => u.role === "ADMIN",
  manageUsers: (u: CurrentUser) => u.role === "ADMIN",
};
