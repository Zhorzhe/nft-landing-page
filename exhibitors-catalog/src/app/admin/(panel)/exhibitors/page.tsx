/**
 * Списък на изложителите в админ панела: търсене по име/щанд,
 * филтри по изложение, категория, статус и липсващо лого, страниране.
 */
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { PageHeader, Notice, AdminPagination } from "@/components/admin/page-header";
import { countryName } from "@/lib/countries";
import { togglePublished } from "./actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Изложители" };

const PER_PAGE = 50;

export default async function ExhibitorsAdminPage(props: PageProps<"/admin/exhibitors">) {
  await requireUser();
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q").trim();
  const exhibition = get("exhibition");
  const category = get("category");
  const published = get("published");
  const logo = get("logo");
  const page = Math.max(1, Number(get("page")) || 1);

  const where: Prisma.ExhibitorWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { companyNameEn: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { participations: { some: { boothNumber: { equals: q, mode: "insensitive" } } } },
            ],
          }
        : {},
      exhibition ? { participations: { some: { exhibitionId: exhibition } } } : {},
      category ? { categories: { some: { categoryId: category } } } : {},
      published === "1" ? { isPublished: true } : published === "0" ? { isPublished: false } : {},
      logo === "0" ? { logo: null } : {},
    ],
  };

  const [total, rows, exhibitions, categories] = await Promise.all([
    db.exhibitor.count({ where }),
    db.exhibitor.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        companyName: true,
        logo: true,
        country: true,
        isPublished: true,
        updatedAt: true,
        participations: {
          select: { boothNumber: true, exhibition: { select: { id: true, nameBg: true } } },
        },
        _count: { select: { categories: true } },
      },
    }),
    db.exhibition.findMany({ orderBy: { startDate: "desc" }, select: { id: true, nameBg: true } }),
    db.category.findMany({ orderBy: { nameBg: "asc" }, select: { id: true, nameBg: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => {
    const params = new URLSearchParams({ q, exhibition, category, published, logo, page: String(p) });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    return `/admin/exhibitors?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Изложители"
        description={`${total} ${total === 1 ? "резултат" : "резултата"}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/import" className="btn-secondary">
              Импорт от Excel
            </Link>
            <Link href="/admin/exhibitors/new" className="btn-primary">
              + Нов изложител
            </Link>
          </div>
        }
      />
      {sp.deleted && <Notice>Изложителят е изтрит.</Notice>}

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Име, имейл или щанд…"
          className="input lg:col-span-2"
          aria-label="Търсене"
        />
        <select name="exhibition" defaultValue={exhibition} className="input" aria-label="Изложение">
          <option value="">Всички изложения</option>
          {exhibitions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nameBg}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category} className="input" aria-label="Категория">
          <option value="">Всички категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameBg}
            </option>
          ))}
        </select>
        <select name="published" defaultValue={published} className="input" aria-label="Статус">
          <option value="">Всички статуси</option>
          <option value="1">Публикувани</option>
          <option value="0">Непубликувани</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Търси</button>
          <Link href="/admin/exhibitors" className="btn-secondary" title="Изчисти">
            ✕
          </Link>
        </div>
        {logo === "0" && <input type="hidden" name="logo" value="0" />}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Фирма</th>
              <th className="px-4 py-3">Изложения / щанд</th>
              <th className="hidden px-4 py-3 md:table-cell">Държава</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Няма намерени изложители.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/exhibitors/${r.id}`} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
                      {r.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </span>
                    <span>
                      <span className="font-medium text-brand-700 hover:underline">{r.companyName}</span>
                      {r._count.categories === 0 && (
                        <span className="block text-xs text-amber-600">без категория</span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.participations.length === 0 && <span className="text-amber-600">няма</span>}
                  {r.participations.map((p) => (
                    <span key={p.exhibition.id} className="block">
                      {p.exhibition.nameBg}
                      {p.boothNumber && <b className="text-gray-800"> · {p.boothNumber}</b>}
                    </span>
                  ))}
                </td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">{countryName(r.country, "bg")}</td>
                <td className="px-4 py-3">
                  <form action={togglePublished.bind(null, r.id)}>
                    <button
                      className={
                        r.isPublished
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : "rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
                      }
                      title="Натиснете за смяна"
                    >
                      {r.isPublished ? "Публикуван" : "Скрит"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} totalPages={totalPages} href={href} />
    </>
  );
}
