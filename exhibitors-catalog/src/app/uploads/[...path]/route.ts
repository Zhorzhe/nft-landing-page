/**
 * Сервира качените файлове при STORAGE_DRIVER=local.
 * (При S3 файловете се сервират директно от хранилището/CDN.)
 * Файловете имат уникални имена, затова се кешират "завинаги".
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path: parts } = await ctx.params;
  const target = path.resolve(UPLOAD_DIR, ...parts);
  // Защита срещу "../" — файлът трябва да е вътре в UPLOAD_DIR.
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(target);
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
