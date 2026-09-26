import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "../category-form";
import { saveCategory } from "../actions";

export const metadata = { title: "Нова категория" };

export default async function NewCategoryPage() {
  await requireAdmin();
  const parents = await db.category.findMany({ where: { parentId: null }, orderBy: { nameBg: "asc" } });
  return (
    <>
      <PageHeader title="Нова категория" back={{ href: "/admin/categories", label: "Категории" }} />
      <CategoryForm action={saveCategory.bind(null, null)} initial={null} parents={parents} />
    </>
  );
}
