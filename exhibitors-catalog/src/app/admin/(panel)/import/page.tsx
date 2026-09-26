import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { HEADER_ALIASES } from "@/lib/import";
import { ImportForm } from "./import-form";

export const metadata = { title: "Импорт" };

export default async function ImportPage() {
  await requireUser();
  const exhibitions = await db.exhibition.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: { id: true, nameBg: true, status: true },
  });
  return (
    <>
      <PageHeader
        title="Импорт на изложители от Excel / CSV"
        description="Първо файлът се проверява и виждате какво ще се случи. Нищо не се записва до стъпка 2."
        action={
          // Файл за изтегляне, не страница — затова обикновен <a>.
          <a href="/admin/import-template" className="btn-secondary" download>
            ⬇ Изтегли шаблон (.xlsx)
          </a>
        }
      />
      <ImportForm exhibitions={exhibitions} />
      <details className="card mt-6 p-5 text-sm">
        <summary className="cursor-pointer font-semibold">Какви колони се разпознават?</summary>
        <p className="mt-3 text-gray-600">
          Задължителна е само колоната с името на фирмата. Заглавията могат да са на английски или български. Няколко
          категории се разделят с „;“. Държавата може да е код (BG) или име (България / Bulgaria). За „нов“ и „акцент“
          се приемат „да“, „1“, „x“.
        </p>
        <table className="mt-3 w-full text-left">
          <tbody className="divide-y">
            {Object.entries(HEADER_ALIASES).map(([key, aliases]) => (
              <tr key={key}>
                <td className="py-1 pr-4 font-mono text-xs">{key}</td>
                <td className="py-1 text-gray-600">{aliases.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
