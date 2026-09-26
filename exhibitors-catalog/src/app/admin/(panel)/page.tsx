import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";

export const metadata = { title: "Табло" };

const ACTIONS: Record<string, string> = {
  create: "добави",
  update: "редактира",
  delete: "изтри",
  import: "импортира",
};
const ENTITIES: Record<string, string> = {
  Exhibitor: "изложител",
  Exhibition: "изложение",
  Category: "категория",
  User: "потребител",
};

export default async function Dashboard(props: PageProps<"/admin">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [exhibitors, unpublished, activeExhibitions, categories, noLogo, recent, exhibitions] =
    await Promise.all([
      db.exhibitor.count(),
      db.exhibitor.count({ where: { isPublished: false } }),
      db.exhibition.count({ where: { status: "ACTIVE" } }),
      db.category.count(),
      db.exhibitor.count({ where: { logo: null } }),
      db.auditLog.findMany({ take: 12, orderBy: { createdAt: "desc" }, include: { user: true } }),
      db.exhibition.findMany({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { participations: true } } },
      }),
    ]);

  const stats = [
    { label: "Изложители", value: exhibitors, href: "/admin/exhibitors" },
    { label: "Непубликувани", value: unpublished, href: "/admin/exhibitors?published=0" },
    { label: "Без лого", value: noLogo, href: "/admin/exhibitors?logo=0" },
    { label: "Активни изложения", value: activeExhibitions, href: "/admin/exhibitions" },
    { label: "Категории", value: categories, href: "/admin/categories" },
  ];

  return (
    <>
      <PageHeader
        title={`Здравейте, ${user.name.split(" ")[0]}`}
        action={
          <Link href="/admin/exhibitors/new" className="btn-primary">
            + Нов изложител
          </Link>
        }
      />
      {sp.denied && <Notice kind="error">Нямате права за тази страница.</Notice>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-brand-300">
            <p className="text-2xl font-bold text-brand-700">{s.value}</p>
            <p className="text-sm text-gray-600">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Активни изложения</h2>
          {exhibitions.length === 0 && <p className="text-sm text-gray-500">Няма активни изложения.</p>}
          <ul className="divide-y">
            {exhibitions.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/exhibitions/${e.id}`} className="font-medium hover:underline">
                  {e.nameBg}
                </Link>
                <Link href={`/admin/exhibitors?exhibition=${e.id}`} className="text-brand-600 hover:underline">
                  {e._count.participations} изложители
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Последни промени</h2>
          {recent.length === 0 && <p className="text-sm text-gray-500">Все още няма промени.</p>}
          <ul className="space-y-2 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex gap-2">
                <time className="shrink-0 text-gray-400" dateTime={r.createdAt.toISOString()}>
                  {r.createdAt.toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Sofia" })}
                </time>
                <span>
                  <b>{r.user?.name ?? "—"}</b> {ACTIONS[r.action] ?? r.action} {ENTITIES[r.entity] ?? r.entity}{" "}
                  {r.summary && <span className="text-gray-600">„{r.summary}“</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
