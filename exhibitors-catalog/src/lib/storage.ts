/**
 * Съхранение на качени файлове (лога).
 *
 * Два режима, избират се с env променливата STORAGE_DRIVER:
 *   - "local" (по подразбиране): файловете се пишат в папка UPLOAD_DIR
 *     (по подразбиране ./uploads) и се сервират от /uploads/... чрез
 *     src/app/uploads/[...path]/route.ts. Подходящо за VPS с постоянен диск.
 *   - "s3": всяко S3-съвместимо хранилище (Cloudflare R2, AWS S3, DigitalOcean
 *     Spaces, Backblaze B2). Нужно при хостинг без постоянен диск (напр. Vercel).
 *
 * В базата се записва публичният адрес на файла ("/uploads/logos/x.webp" или
 * "https://cdn.example.com/logos/x.webp"), така че смяната на драйвер не
 * изисква промени в останалия код.
 */
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "uploads");

let s3: S3Client | null = null;
function s3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3;
}

/** Записва файл и връща публичния му адрес. `key` е напр. "logos/abc.webp". */
export async function saveFile(key: string, data: Buffer, contentType: string): Promise<string> {
  if (driver === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${(process.env.S3_PUBLIC_URL || "").replace(/\/$/, "")}/${key}`;
  }
  const target = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return `/uploads/${key}`;
}

/** Изтрива файл по публичния му адрес (грешките се игнорират). */
export async function deleteFile(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  try {
    if (publicUrl.startsWith("/uploads/")) {
      const key = publicUrl.slice("/uploads/".length);
      const target = path.join(UPLOAD_DIR, key);
      if (target.startsWith(UPLOAD_DIR + path.sep)) await unlink(target);
      return;
    }
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
    if (driver === "s3" && base && publicUrl.startsWith(base + "/")) {
      await s3Client().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: publicUrl.slice(base.length + 1) }),
      );
    }
  } catch {
    // Липсващ файл не е проблем — записът в базата е важният.
  }
}
