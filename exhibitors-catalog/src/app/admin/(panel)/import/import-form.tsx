"use client";

import { useActionState, useRef, startTransition } from "react";
import Link from "next/link";
import { runImport, type ImportState } from "./actions";

const ACTION_LABEL = {
  create: { text: "Нов", cls: "bg-green-100 text-green-800" },
  update: { text: "Обновяване", cls: "bg-blue-100 text-blue-800" },
  skip: { text: "Пропуснат", cls: "bg-gray-200 text-gray-700" },
  error: { text: "Грешка", cls: "bg-red-100 text-red-800" },
};

export function ImportForm({ exhibitions }: { exhibitions: { id: string; nameBg: string; status: string }[] }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(runImport, {});
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (mode: "preview" | "commit") => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("mode", mode);
    startTransition(() => action(fd));
  };

  const preview = state.preview ?? [];
  const counts = {
    create: preview.filter((r) => r.action === "create").length,
    update: preview.filter((r) => r.action === "update").length,
    skip: preview.filter((r) => r.action === "skip").length,
    error: preview.filter((r) => r.action === "error").length,
  };

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit("preview");
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="file">
              Файл (.xlsx или .csv)
            </label>
            <input id="file" name="file" type="file" accept=".xlsx,.csv" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="exhibitionId">
              Изложение по подразбиране
            </label>
            <select id="exhibitionId" name="exhibitionId" className="input" defaultValue="">
              <option value="">— без (или от колоната „exhibition“) —</option>
              {exhibitions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nameBg}
                  {e.status !== "ACTIVE" ? ` (${e.status === "DRAFT" ? "чернова" : "архив"})` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Изложителите от файла ще бъдат добавени към това изложение.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="updateExisting" defaultChecked className="size-4 accent-brand-600" />
            Обновявай съществуващите изложители
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="createMissingCategories" className="size-4 accent-brand-600" />
            Създавай липсващите категории
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-secondary" disabled={pending}>
            {pending ? "Обработка…" : "1. Провери файла"}
          </button>
          {preview.length > 0 && !state.summary && (
            <button
              type="button"
              className="btn-primary"
              disabled={pending || counts.create + counts.update === 0}
              onClick={() => {
                if (confirm(`Ще бъдат записани ${counts.create} нови и обновени ${counts.update} изложители. Продължаване?`))
                  submit("commit");
              }}
            >
              2. Импортирай {counts.create + counts.update} реда
            </button>
          )}
        </div>
      </form>

      {state.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {state.summary && (
        <div className="card space-y-2 p-5 text-sm">
          <h2 className="text-base font-semibold text-green-700">Импортът приключи: {state.fileName}</h2>
          <p>
            Нови: <b>{state.summary.created}</b> · Обновени: <b>{state.summary.updated}</b> · Пропуснати:{" "}
            <b>{state.summary.skipped}</b> · С грешка: <b>{state.summary.failed.length}</b>
            {state.summary.logoErrors > 0 && <> · Неуспешно изтеглени лога: <b>{state.summary.logoErrors}</b></>}
          </p>
          {state.summary.failed.length > 0 && (
            <ul className="list-disc pl-5 text-red-700">
              {state.summary.failed.map((f) => (
                <li key={f.line}>
                  Ред {f.line} ({f.companyName || "—"}): {f.error}
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/exhibitors" className="btn-primary mt-2">
            Към изложителите
          </Link>
        </div>
      )}

      {preview.length > 0 && !state.summary && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap gap-3 border-b bg-gray-50 px-4 py-3 text-sm">
            <b>{state.fileName}</b>
            <span>{preview.length} реда:</span>
            <span className="text-green-700">{counts.create} нови</span>
            <span className="text-blue-700">{counts.update} за обновяване</span>
            <span className="text-gray-600">{counts.skip} пропуснати</span>
            <span className="text-red-700">{counts.error} с грешки</span>
          </div>
          {state.unknownHeaders && state.unknownHeaders.length > 0 && (
            <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Непознати колони (ще бъдат игнорирани): {state.unknownHeaders.join(", ")}
            </p>
          )}
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs text-gray-500 uppercase shadow-sm">
                <tr>
                  <th className="px-3 py-2">Ред</th>
                  <th className="px-3 py-2">Фирма</th>
                  <th className="px-3 py-2">Действие</th>
                  <th className="px-3 py-2">Изложение / щанд</th>
                  <th className="px-3 py-2">Бележки</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.slice(0, 1000).map((r) => (
                  <tr key={r.line} className={r.action === "error" ? "bg-red-50/50" : ""}>
                    <td className="px-3 py-2 text-gray-400">{r.line}</td>
                    <td className="px-3 py-2 font-medium">{r.companyName || <i className="text-gray-400">празно</i>}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${ACTION_LABEL[r.action].cls}`}>
                        {ACTION_LABEL[r.action].text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.exhibition ?? "—"}
                      {r.booth && <b className="text-gray-800"> · {r.booth}</b>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.errors.map((e) => (
                        <p key={e} className="text-red-700">
                          {e}
                        </p>
                      ))}
                      {r.warnings.map((w) => (
                        <p key={w} className="text-amber-700">
                          {w}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
