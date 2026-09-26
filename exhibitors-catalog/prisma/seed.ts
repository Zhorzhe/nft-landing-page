/**
 * Начални данни: първи администратор + (по желание) демо данни.
 *
 *   npm run db:seed              -> само администратор (от ADMIN_EMAIL / ADMIN_PASSWORD)
 *   SEED_DEMO=1 npm run db:seed  -> + примерни категории, изложения и фирми
 *
 * Демо фирмите са измислени и са само за преглед на дизайна.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 10) {
    console.log("⚠ ADMIN_EMAIL / ADMIN_PASSWORD (мин. 10 символа) не са зададени — пропускам администратора.");
    return;
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Администраторът ${email} вече съществува.`);
    return;
  }
  await db.user.create({
    data: { email, name: "Администратор", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✓ Създаден администратор ${email}`);
}

const CATEGORIES: [string, string, [string, string][]][] = [
  ["Селско стопанство", "Agriculture", [["Селскостопанска техника", "Agricultural machinery"], ["Семена и посадъчен материал", "Seeds and planting material"], ["Торове и препарати за растителна защита", "Fertilisers and plant protection"], ["Животновъдство", "Livestock farming"]]],
  ["Храни и напитки", "Food and beverages", [["Хранително-вкусова промишленост", "Food processing"], ["Вино и спиртни напитки", "Wine and spirits"]]],
  ["Машиностроене", "Mechanical engineering", [["Металообработващи машини", "Metalworking machinery"], ["Автоматизация и роботика", "Automation and robotics"]]],
  ["Електроника и електротехника", "Electronics and electrical engineering", []],
  ["Енергетика и ВЕИ", "Energy and renewables", []],
  ["Строителство", "Construction", []],
  ["Опаковки", "Packaging", []],
  ["Услуги и консултации", "Services and consulting", []],
];

const EXHIBITIONS = [
  { nameBg: "Международен технически панаир 2026", nameEn: "International Technical Fair 2026", startDate: "2026-09-28", endDate: "2026-10-02", status: "ACTIVE" as const },
  { nameBg: "Агра 2027", nameEn: "Agra 2027", startDate: "2027-03-03", endDate: "2027-03-07", status: "ACTIVE" as const },
  { nameBg: "Винария 2027", nameEn: "Vinaria 2027", startDate: "2027-02-17", endDate: "2027-02-20", status: "ACTIVE" as const },
  { nameBg: "Агра 2026", nameEn: "Agra 2026", startDate: "2026-03-04", endDate: "2026-03-08", status: "ARCHIVED" as const },
];

const PREFIX = ["Агро", "Техно", "Био", "Евро", "Балкан", "Тракия", "Марица", "Родопи", "Хеброс", "Пловдив", "Нова", "Стара Планина", "Дунав", "Интер", "Метал", "Грийн", "Смарт", "Юнион"];
const SUFFIX = ["Трейд", "Машини", "Систем", "Инвест", "Консулт", "Инженеринг", "Фарм", "Продукт", "Енерджи", "Пак", "Лаб", "Груп"];
const FORMS = ["ООД", "ЕООД", "АД", "ЕАД"];
const FOREIGN: [string, string][] = [["Demo Agrartechnik GmbH", "DE"], ["Demo Makina Sanayi A.Ş.", "TR"], ["Demo Macchine S.r.l.", "IT"], ["Demo Hellas S.A.", "GR"], ["Demo Agro S.R.L.", "RO"], ["Demo Machinery Sp. z o.o.", "PL"], ["Demo Tech d.o.o.", "RS"], ["Demo Solutions B.V.", "NL"]];

async function seedDemo() {
  if ((await db.exhibitor.count()) > 0) {
    console.log("✓ В базата вече има изложители — пропускам демо данните.");
    return;
  }
  const catIds: string[] = [];
  let order = 0;
  for (const [bg, en, children] of CATEGORIES) {
    const parent = await db.category.create({ data: { nameBg: bg, nameEn: en, slug: slugify(en), sortOrder: order++ } });
    catIds.push(parent.id);
    for (const [cbg, cen] of children) {
      const c = await db.category.create({ data: { nameBg: cbg, nameEn: cen, slug: slugify(cen), parentId: parent.id } });
      catIds.push(c.id);
    }
  }
  const exIds: string[] = [];
  for (const e of EXHIBITIONS) {
    const ex = await db.exhibition.create({
      data: { ...e, slug: slugify(e.nameEn), startDate: new Date(e.startDate), endDate: new Date(e.endDate), venue: "Международен Панаир Пловдив" },
    });
    exIds.push(ex.id);
  }

  // Детерминиран "случаен" генератор — демо данните са еднакви при всяко пускане.
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pickN = <T,>(arr: T[], n: number) => [...arr].sort(() => rnd() - 0.5).slice(0, n);

  const names = new Set<string>();
  while (names.size < 60) {
    names.add(`${PREFIX[Math.floor(rnd() * PREFIX.length)]} ${SUFFIX[Math.floor(rnd() * SUFFIX.length)]} ${FORMS[Math.floor(rnd() * FORMS.length)]}`);
  }
  const all: [string, string][] = [...[...names].map((n) => [n, "BG"] as [string, string]), ...FOREIGN];

  let i = 0;
  for (const [name, country] of all) {
    i++;
    const slug = slugify(name);
    const ex = await db.exhibitor.create({
      data: {
        companyName: name,
        slug,
        country,
        city: country === "BG" ? pickN(["Пловдив", "София", "Стара Загора", "Пазарджик", "Варна", "Бургас", "Хасково"], 1)[0] : null,
        descriptionBg: `${name} е демонстрационна фирма, създадена само за преглед на каталога. Тук изложителят представя накратко своята дейност, продукти и услуги, пазари и предимства пред клиентите.`,
        descriptionEn: `${name} is a demo company created only to preview the catalogue. Here the exhibitor briefly presents its activity, products and services, markets and advantages.`,
        website: `https://www.example.com/${slug}`,
        email: `office@${slug.slice(0, 20)}.example`,
        phone: "+359 32 000 " + String(100 + i).padStart(3, "0"),
        facebook: i % 3 === 0 ? `https://facebook.com/${slug}` : null,
        linkedin: i % 4 === 0 ? `https://linkedin.com/company/${slug}` : null,
      },
    });
    await db.exhibitorCategory.createMany({ data: pickN(catIds, 1 + Math.floor(rnd() * 3)).map((categoryId) => ({ exhibitorId: ex.id, categoryId })) });
    const exhibitions = pickN(exIds, 1 + Math.floor(rnd() * 2));
    await db.participation.createMany({
      data: exhibitions.map((exhibitionId) => ({
        exhibitorId: ex.id,
        exhibitionId,
        boothNumber: `${"ABCDE"[Math.floor(rnd() * 5)]}${1 + Math.floor(rnd() * 60)}`,
        hall: `Палата ${1 + Math.floor(rnd() * 10)}`,
        isFeatured: rnd() < 0.08,
        isNewExhibitor: rnd() < 0.2,
      })),
    });
  }
  console.log(`✓ Демо данни: ${catIds.length} категории, ${exIds.length} изложения, ${all.length} изложители.`);
}

async function main() {
  await seedAdmin();
  if (process.env.SEED_DEMO === "1") await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
