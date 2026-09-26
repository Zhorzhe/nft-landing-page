"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { readSpreadsheet, previewImport, commitImport, type PreviewRow, type ImportSummary } from "@/lib/import";
import { hasFile } from "@/lib/images";
import { checkbox, text } from "@/lib/validation";

export type ImportState = {
  error?: string;
  fileName?: string;
  unknownHeaders?: string[];
  preview?: PreviewRow[];
  summary?: ImportSummary;
};

const MAX_FILE = 15 * 1024 * 1024;

/** mode=preview: само проверка; mode=commit: запис. */
export async function runImport(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireUser();
  const file = fd.get("file");
  if (!hasFile(file)) return { error: "Изберете файл (.xlsx или .csv)." };
  if (file.size > MAX_FILE) return { error: "Файлът е по-голям от 15 MB." };

  const opts = {
    defaultExhibitionId: text(fd, "exhibitionId") || null,
    createMissingCategories: checkbox(fd, "createMissingCategories"),
    updateExisting: checkbox(fd, "updateExisting"),
  };

  try {
    const { rows, unknownHeaders } = await readSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
    if (text(fd, "mode") === "commit") {
      const summary = await commitImport(rows, opts);
      await audit(user.id, "import", "Exhibitor", null, `${file.name}: ${summary.created} нови, ${summary.updated} обновени`);
      revalidatePath("/", "layout");
      return { fileName: file.name, summary };
    }
    return { fileName: file.name, unknownHeaders, preview: await previewImport(rows, opts) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
