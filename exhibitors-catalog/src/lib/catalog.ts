/**
 * Заявки към базата за публичния каталог.
 *
 * Филтрите идват от адреса (?q=&exhibition=&category=&country=&letter=&featured=&new=&page=),
 * така всеки филтриран изглед може да се сподели като линк и да се индексира.
 *
 * Броячите до всеки филтър ("Агра 2027 (124)") се изчисляват "фасетно":
 * за всяка група филтри броим резултатите при всички ОСТАНАЛИ активни филтри.
 */
import { cache } from "react";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 24;

export type CatalogFilters = {
  q: string;
  exhibition: string | null; // slug
  categories: string[]; // slugs
  country: string | null; // ISO код
  letter: string | null;
  featured: boolean;
  isNew: boolean;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(",")).filter(Boolean);

/** Превръща searchParams от адреса в типизирани филтри. */
export function parseFilters(params: RawParams): CatalogFilters {
  const letter = first(params.letter).toUpperCase();
  const page = Number.parseInt(first(params.page), 10);
  const country = first(params.country).toUpperCase();
  return {
    q: first(params.q).trim().slice(0, 100),
    exhibition: first(params.exhibition) || null,
    categories: all(params.category).slice(0, 20),
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    letter: /^[A-ZА-Я]$/.test(letter) ? letter : null,
    featured: first(params.featured) === "1",
    isNew: first(params.new) === "1",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/** Връща адрес към каталога с променени филтри (за линкове и страниране). */
export function catalogHref(
  base: string,
  filters: CatalogFilters,
  change: Partial<CatalogFilters> = {},
): string {
  const f = { ...filters, page: 1, ...change };
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.exhibition) sp.set("exhibition", f.exhibition);
  for (const c of f.categories) sp.append("category", c);
  if (f.country) sp.set("country", f.country);
  if (f.letter) sp.set("letter", f.letter);
  if (f.featured) sp.set("featured", "1");
  if (f.isNew) sp.set("new", "1");
  if (f.page > 1) sp.set("page", String(f.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Изложения, видими публично (активни + архив). Черновите са скрити. */
const PUBLIC_EXHIBITION: Prisma.ExhibitionWhereInput = { status: { not: "DRAFT" } };

type Omit_ = "exhibition" | "categories" | "country" | "letter" | "flags";

/**
 * Изгражда WHERE условието за изложителите.
 * `skip` изключва група филтри — използва се при броячите.
 */
function buildWhere(
  f: CatalogFilters,
  categoryIds: string[] | null,
  skip: Omit_[] = [],
): Prisma.ExhibitorWhereInput {
  const and: Prisma.ExhibitorWhereInput[] = [{ isPublished: true }];

  if (f.q) {
    and.push({
      OR: [
        { companyName: { contains: f.q, mode: "insensitive" } },
        { companyNameEn: { contains: f.q, mode: "insensitive" } },
        // търсене и по номер на щанд, напр. "B16"
        {
          participations: {
            some: { boothNumber: { equals: f.q, mode: "insensitive" }, exhibition: PUBLIC_EXHIBITION },
          },
        },
      ],
    });
  }

  const wantsFlags = !skip.includes("flags") && (f.featured || f.isNew);
  const wantsExhibition = !skip.includes("exhibition") && f.exhibition;
  if (wantsExhibition || wantsFlags) {
    // Без избрано изложение флаговете се отнасят за активните изложения.
    const exhibition: Prisma.ExhibitionWhereInput = wantsExhibition
      ? { ...PUBLIC_EXHIBITION, slug: f.exhibition! }
      : { status: "ACTIVE" };
    and.push({
      participations: {
        some: {
          exhibition,
          ...(wantsFlags && f.featured ? { isFeatured: true } : {}),
          ...(wantsFlags && f.isNew ? { isNewExhibitor: true } : {}),
        },
      },
    });
  }

  if (!skip.includes("categories") && categoryIds) {
    and.push({ categories: { some: { categoryId: { in: categoryIds } } } });
  }
  if (!skip.includes("country") && f.country) and.push({ country: f.country });
  if (!skip.includes("letter") && f.letter) {
    and.push({
      OR: [
        { companyName: { startsWith: f.letter, mode: "insensitive" } },
        { companyNameEn: { startsWith: f.letter, mode: "insensitive" } },
      ],
    });
  }
  return { AND: and };
}

/**
 * Категориите от адреса -> ID-та, включително подкатегориите им
 * (избор на "Селско стопанство" включва и "Животновъдство").
 * null означава "без филтър по категория".
 */
async function resolveCategoryIds(slugs: string[]): Promise<string[] | null> {
  if (slugs.length === 0) return null;
  const selected = await db.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, children: { select: { id: true } } },
  });
  const ids = selected.flatMap((c) => [c.id, ...c.children.map((ch) => ch.id)]);
  return ids.length ? ids : ["__none__"];
}

/** Полета, нужни за картата на изложител в списъка. */
const cardSelect = {
  id: true,
  slug: true,
  companyName: true,
  companyNameEn: true,
  logo: true,
  descriptionBg: true,
  descriptionEn: true,
  country: true,
  city: true,
  website: true,
  email: true,
  phone: true,
  categories: {
    select: { category: { select: { id: true, slug: true, nameBg: true, nameEn: true } } },
  },
  participations: {
    where: { exhibition: PUBLIC_EXHIBITION },
    select: {
      boothNumber: true,
      hall: true,
      isFeatured: true,
      isNewExhibitor: true,
      exhibition: {
        select: { id: true, slug: true, nameBg: true, nameEn: true, status: true, startDate: true },
      },
    },
    orderBy: { exhibition: { startDate: "desc" } },
  },
} satisfies Prisma.ExhibitorSelect;

export type ExhibitorCard = Prisma.ExhibitorGetPayload<{ select: typeof cardSelect }>;

export async function getCatalog(f: CatalogFilters) {
  const categoryIds = await resolveCategoryIds(f.categories);
  const where = buildWhere(f, categoryIds);

  // "Акцентираните" изложители (Featured) се показват първи.
  const featuredCond: Prisma.ExhibitorWhereInput = {
    participations: {
      some: {
        isFeatured: true,
        exhibition: f.exhibition ? { ...PUBLIC_EXHIBITION, slug: f.exhibition } : { status: "ACTIVE" },
      },
    },
  };
  const featuredWhere: Prisma.ExhibitorWhereInput = { AND: [where, featuredCond] };
  const regularWhere: Prisma.ExhibitorWhereInput = { AND: [where, { NOT: featuredCond }] };

  const [total, featuredTotal] = await Promise.all([
    db.exhibitor.count({ where }),
    db.exhibitor.count({ where: featuredWhere }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const orderBy: Prisma.ExhibitorOrderByWithRelationInput[] = [{ companyName: "asc" }, { id: "asc" }];

  // Страниране през двете групи: първо акцентираните, после останалите.
  const featuredTake = Math.max(0, Math.min(PAGE_SIZE, featuredTotal - offset));
  const [featured, regular] = await Promise.all([
    featuredTake > 0
      ? db.exhibitor.findMany({ where: featuredWhere, select: cardSelect, orderBy, skip: offset, take: featuredTake })
      : Promise.resolve([]),
    featuredTake < PAGE_SIZE
      ? db.exhibitor.findMany({
          where: regularWhere,
          select: cardSelect,
          orderBy,
          skip: Math.max(0, offset - featuredTotal),
          take: PAGE_SIZE - featuredTake,
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...featured.map((e) => ({ ...e, featured: true })),
    ...regular.map((e) => ({ ...e, featured: false })),
  ];

  const facets = await getFacets(f, categoryIds);
  return { items, total, page, totalPages, facets };
}

export type CatalogResult = Awaited<ReturnType<typeof getCatalog>>;

async function getFacets(f: CatalogFilters, categoryIds: string[] | null) {
  const exWhere = buildWhere(f, categoryIds, ["exhibition", "flags"]);
  const catWhere = buildWhere(f, categoryIds, ["categories"]);
  const countryWhere = buildWhere(f, categoryIds, ["country"]);
  const letterWhere = buildWhere(f, categoryIds, ["letter"]);
  const flagsWhere = buildWhere(f, categoryIds, ["flags"]);
  const flagExhibition: Prisma.ExhibitionWhereInput = f.exhibition
    ? { ...PUBLIC_EXHIBITION, slug: f.exhibition }
    : { status: "ACTIVE" };

  const [exhibitions, exCounts, categories, catCounts, countryCounts, names, featuredCount, newCount] =
    await Promise.all([
      db.exhibition.findMany({
        where: f.exhibition
          ? { OR: [{ status: "ACTIVE" }, { slug: f.exhibition, ...PUBLIC_EXHIBITION }] }
          : { status: "ACTIVE" },
        orderBy: { startDate: "asc" },
        select: { id: true, slug: true, nameBg: true, nameEn: true, status: true, startDate: true, endDate: true },
      }),
      db.participation.groupBy({
        by: ["exhibitionId"],
        where: { exhibitor: exWhere },
        _count: { _all: true },
      }),
      db.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { nameBg: "asc" }],
        select: { id: true, slug: true, nameBg: true, nameEn: true, parentId: true },
      }),
      db.exhibitorCategory.groupBy({
        by: ["categoryId"],
        where: { exhibitor: catWhere },
        _count: { _all: true },
      }),
      db.exhibitor.groupBy({
        by: ["country"],
        where: { AND: [countryWhere, { country: { not: null } }] },
        _count: { _all: true },
      }),
      // Първите букви за азбучния индекс (само имената — лека заявка).
      db.exhibitor.findMany({ where: letterWhere, select: { companyName: true, companyNameEn: true } }),
      db.exhibitor.count({
        where: { AND: [flagsWhere, { participations: { some: { isFeatured: true, exhibition: flagExhibition } } }] },
      }),
      db.exhibitor.count({
        where: {
          AND: [flagsWhere, { participations: { some: { isNewExhibitor: true, exhibition: flagExhibition } } }],
        },
      }),
    ]);

  const exMap = new Map(exCounts.map((c) => [c.exhibitionId, c._count._all]));
  const catMap = new Map(catCounts.map((c) => [c.categoryId, c._count._all]));

  // Бройката на родителска категория включва и подкатегориите ѝ
  // (приблизително — фирма в две подкатегории се брои два пъти).
  const categoryCount = (id: string) =>
    (catMap.get(id) ?? 0) +
    categories.filter((c) => c.parentId === id).reduce((s, c) => s + (catMap.get(c.id) ?? 0), 0);

  const letters = new Set<string>();
  for (const n of names) {
    for (const name of [n.companyName, n.companyNameEn]) {
      const ch = name?.trim().charAt(0).toUpperCase();
      if (ch && /[A-ZА-Я]/.test(ch)) letters.add(ch);
    }
  }

  return {
    exhibitions: exhibitions.map((e) => ({ ...e, count: exMap.get(e.id) ?? 0 })),
    categories: categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        ...c,
        count: categoryCount(c.id),
        children: categories
          .filter((ch) => ch.parentId === c.id)
          .map((ch) => ({ ...ch, count: catMap.get(ch.id) ?? 0 })),
      })),
    countries: countryCounts
      .filter((c) => c.country)
      .map((c) => ({ code: c.country!, count: c._count._all })),
    letters,
    featuredCount,
    newCount,
  };
}

/** Изложение по slug (за заглавието на каталога). Черновите не се показват. */
export const getPublicExhibition = cache(async (slug: string) =>
  db.exhibition.findFirst({ where: { slug, ...PUBLIC_EXHIBITION } }),
);

/** Пълни данни за страницата на изложител. */
export const getExhibitorBySlug = cache(async (slug: string) =>
  db.exhibitor.findFirst({
    where: { slug, isPublished: true },
    include: {
      categories: { include: { category: true } },
      participations: {
        where: { exhibition: PUBLIC_EXHIBITION },
        include: { exhibition: true },
        orderBy: { exhibition: { startDate: "desc" } },
      },
    },
  }),
);

/** Активните изложения с брой изложители (начална страница и /exhibitions). */
export async function getExhibitionsWithCounts(status: "ACTIVE" | "ARCHIVED") {
  const list = await db.exhibition.findMany({
    where: { status },
    orderBy: { startDate: status === "ACTIVE" ? "asc" : "desc" },
    include: {
      _count: { select: { participations: { where: { exhibitor: { isPublished: true } } } } },
    },
  });
  return list;
}

/** Обобщени числа за началната страница. */
export async function getStats() {
  const [exhibitors, exhibitions, categories] = await Promise.all([
    db.exhibitor.count({ where: { isPublished: true } }),
    db.exhibition.count({ where: { status: "ACTIVE" } }),
    db.category.count({ where: { parentId: null } }),
  ]);
  return { exhibitors, exhibitions, categories };
}
