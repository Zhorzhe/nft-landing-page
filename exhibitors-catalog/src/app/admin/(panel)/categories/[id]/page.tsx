import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/buttons";
import { CategoryForm } from "../category-form";
import { saveCategory, deleteCategory } from "../actions";

export const metadata = { title: "Редакция на категория" };

export default async function EditCategoryPage(props: PageProps<"/admin/categories/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const [cat, parents] = await Promise.all([
    db.category.findUnique({ where: { id }, include: { _count: { select: { exhibitors: true, children: true } } } }),
    db.category.findMany({ where: { parentId: null }, orderBy: { nameBg: "asc" } }),
  ]);
  if (!cat) notFound();
  return (
    <>
      <PageHeader
        title={cat.nameBg}
        description={`${cat._count.exhibitors} изложители`}
        back={{ href: "/admin/categories", label: "Категории" }}
        action={
          <DeleteButton
            action={deleteCategory.bind(null, cat.id)}
            confirmText={`Изтриване на „${cat.nameBg}“? ${cat._count.exhibitors} изложители ще загубят тази категория${cat._count.children ? `, а ${cat._count.children} подкатегории ще станат основни` : ""}.`}
          />
        }
      />
      <CategoryForm action={saveCategory.bind(null, cat.id)} initial={cat} parents={parents} />
    </>
  );
}
