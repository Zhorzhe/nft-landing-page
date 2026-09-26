/** Генерира Excel шаблон за импорт (с пример и указания). */
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/permissions";
import { TEMPLATE_COLUMNS } from "@/lib/import";

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Изложители");
  ws.columns = TEMPLATE_COLUMNS.map((key) => ({ header: key, key, width: key.startsWith("description") ? 50 : 22 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E3F7" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.addRow({
    company_name: "Примерна Фирма ООД",
    company_name_en: "Example Company Ltd.",
    description_bg: "Кратко описание на дейността на фирмата.",
    description_en: "Short description of the company.",
    country: "BG",
    city: "Пловдив",
    website: "www.example.bg",
    email: "office@example.bg",
    phone: "+359 32 000 000",
    categories: "Селскостопанска техника; Торове и препарати",
    booth_number: "B16",
    hall: "Палата 5",
    is_new: "да",
    is_featured: "",
  });

  const help = wb.addWorksheet("Указания");
  help.getColumn(1).width = 110;
  [
    "Попълнете листа „Изложители“ — по един ред на фирма. Задължително е само company_name.",
    "Колоната exhibition може да съдържа име или адрес (slug) на изложение; ако е празна, се използва избраното при импорта.",
    "Няколко категории се разделят с „;“. Имената трябва да съвпадат с категориите в админ панела (или включете „Създавай липсващите категории“).",
    "country: двубуквен код (BG, DE, TR) или име на държавата на български/английски.",
    "is_new / is_featured: „да“, „1“ или „x“ за да; празно за не.",
    "logo_url: публичен адрес на лого — ще бъде изтеглено и оптимизирано автоматично.",
    "Съществуващи фирми се разпознават по име. Празните клетки НЕ изтриват вече въведени данни.",
  ].forEach((t) => help.addRow([t]));

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="shablon-izlozhiteli.xlsx"',
    },
  });
}
