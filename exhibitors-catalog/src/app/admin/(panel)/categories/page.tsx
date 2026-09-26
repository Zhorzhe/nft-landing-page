import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";

export const metadata = { title: "Категории" };

export default async function CategoriesAdminPage(props: PageProps<"/admin/categories">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const isAdmin = user.role === "ADMIN";
  const roots = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }],
    include: {
      _count: { select: { exhibitors: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }],
        include: { _count: { select: { exhibitors: true } } },
      },
    },
  });

  const Row = ({ c, child }: { c: (typeof roots)[number] | (typeof roots)[number]["children"][number]; child?: boolean }) => (
    <tr className="hover:bg-gray-50">
      <td className={`px-4 py-2.5 ${child ? "pl-10 text-gray-700" : "font-medium"}`}>
        {child && <span className="mr-1 text-gray-300">└</span>}
        {isAdmin ? (
          <Link href={`/admin/categories/${c.id}`} className="text-brand-700 hover:underline">
            {c.nameBg}
          </Link>
        ) : (
          c.nameBg
        )}
      </td>
      <td className="px-4 py-2.5 text-gray-600">{c.nameEn || <span className="text-amber-600">липсва превод</span>}</td>
      <td className="px-4 py-2.5">
        <Link href={`/admin/exhibitors?category=${c.id}`} className="text-brand-600 hover:underline">
          {c._count.exhibitors}
        </Link>
      </td>
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Категории (браншове)"
        action={
          isAdmin && (
            <Link href="/admin/categories/new" className="btn-primary">
              + Нова категория
            </Link>
          )
        }
      />
      {sp.saved && <Notice>Категорията е запазена.</Notice>}
      {sp.deleted && <Notice>Категорията е изтрита.</Notice>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Име (BG)</th>
              <th className="px-4 py-3">Име (EN)</th>
              <th className="px-4 py-3">Изложители</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roots.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  Все още няма категории.
                </td>
              </tr>
            )}
            {roots.map((c) => [
              <Row key={c.id} c={c} />,
              ...c.children.map((ch) => <Row key={ch.id} c={ch} child />),
            ])}
          </tbody>
        </table>
      </div>
    </>
  );
}
