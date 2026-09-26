import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";
import { formatDateRange } from "@/lib/utils";

export const metadata = { title: "Изложения" };

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Активно", cls: "bg-green-100 text-green-800" },
  DRAFT: { label: "Чернова", cls: "bg-amber-100 text-amber-800" },
  ARCHIVED: { label: "Архив", cls: "bg-gray-200 text-gray-700" },
};

export default async function ExhibitionsAdminPage(props: PageProps<"/admin/exhibitions">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const rows = await db.exhibition.findMany({
    where: status ? { status: status as "ACTIVE" | "DRAFT" | "ARCHIVED" } : {},
    orderBy: [{ startDate: "desc" }],
    include: { _count: { select: { participations: true } } },
  });
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      <PageHeader
        title="Изложения"
        action={
          isAdmin && (
            <Link href="/admin/exhibitions/new" className="btn-primary">
              + Ново изложение
            </Link>
          )
        }
      />
      {sp.deleted && <Notice>Изложението е изтрито.</Notice>}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Всички"], ["ACTIVE", "Активни"], ["DRAFT", "Чернови"], ["ARCHIVED", "Архив"]].map(([v, l]) => (
          <Link
            key={v}
            href={v ? `/admin/exhibitions?status=${v}` : "/admin/exhibitions"}
            className={status === v ? "btn-primary" : "btn-secondary"}
          >
            {l}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Изложение</th>
              <th className="px-4 py-3">Дати</th>
              <th className="px-4 py-3">Изложители</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Няма изложения.
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {isAdmin ? (
                    <Link href={`/admin/exhibitions/${e.id}`} className="text-brand-700 hover:underline">
                      {e.nameBg}
                    </Link>
                  ) : (
                    e.nameBg
                  )}
                  {e.nameEn && <span className="block text-xs text-gray-500">{e.nameEn}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDateRange(e.startDate, e.endDate, "bg")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/exhibitors?exhibition=${e.id}`} className="text-brand-600 hover:underline">
                    {e._count.participations}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[e.status].cls}`}>
                    {STATUS[e.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
