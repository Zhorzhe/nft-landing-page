/**
 * Автоматична оптимизация на качени лога.
 *
 * Всяко качено изображение (JPG, PNG, WebP, GIF, SVG, AVIF, TIFF):
 *   1. се проверява, че наистина е изображение и не е прекалено голямо;
 *   2. се завърта според EXIF (снимки от телефон);
 *   3. се смалява до максимум 600×600 px (без уголемяване, без изрязване);
 *   4. се конвертира в WebP (обикновено 5–20 пъти по-малък файл);
 *   5. прозрачността се запазва (важно за лога).
 */
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { saveFile } from "./storage";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB входен файл
const MAX_SIZE = 600;

export class ImageError extends Error {}

export async function optimizeImage(input: Buffer): Promise<Buffer> {
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError("Файлът не е валидно изображение.");
  }
  if (!meta.width || !meta.height) throw new ImageError("Файлът не е валидно изображение.");

  return sharp(input, { limitInputPixels: 40_000_000, density: 300 })
    .rotate()
    .resize(MAX_SIZE, MAX_SIZE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
}

/**
 * Обработва File от форма (или Buffer от импорт) и връща публичния адрес.
 * `folder` е напр. "logos" или "exhibitions".
 */
export async function processUpload(file: File | Buffer, folder: string): Promise<string> {
  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    if (file.size > MAX_UPLOAD_BYTES) throw new ImageError("Файлът е по-голям от 8 MB.");
    buffer = Buffer.from(await file.arrayBuffer());
  }
  if (buffer.length > MAX_UPLOAD_BYTES) throw new ImageError("Файлът е по-голям от 8 MB.");
  const optimized = await optimizeImage(buffer);
  return saveFile(`${folder}/${randomUUID()}.webp`, optimized, "image/webp");
}

/** Изтегля изображение от външен адрес (при импорт с колона logo_url). */
export async function fetchRemoteImage(url: string): Promise<Buffer> {
  if (!/^https?:\/\//i.test(url)) throw new ImageError("Невалиден адрес на лого.");
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
  if (!res.ok) throw new ImageError(`Логото не може да се изтегли (HTTP ${res.status}).`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_UPLOAD_BYTES) throw new ImageError("Логото е по-голямо от 8 MB.");
  return Buffer.from(await res.arrayBuffer());
}

/** true, ако полето за файл във формата е попълнено. */
export function hasFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && value.size > 0;
}
