import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";

export const metadata = { title: "Потребители" };

export default async function UsersPage(props: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const users = await db.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Потребители"
        action={
          <Link href="/admin/users/new" className="btn-primary">
            + Нов потребител
          </Link>
        }
      />
      {sp.saved && <Notice>Потребителят е запазен.</Notice>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Име</th>
              <th className="px-4 py-3">Имейл</th>
              <th className="px-4 py-3">Роля</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">{u.role === "ADMIN" ? "Администратор" : "Редактор"}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Активен</span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">Неактивен</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
