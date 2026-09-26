/**
 * /sitemap.xml — генерира се автоматично от базата при всяка заявка.
 * Съдържа началната страница, каталога, изложенията и всички публикувани
 * изложители на двата езика (с hreflang връзки).
 */
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/utils";

const entry = (path: string, lastModified?: Date, priority?: number): MetadataRoute.Sitemap[number] => ({
  url: `${SITE_URL}/bg${path}`,
  lastModified,
  priority,
  alternates: { languages: { bg: `${SITE_URL}/bg${path}`, en: `${SITE_URL}/en${path}` } },
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [exhibitions, exhibitors] = await Promise.all([
    db.exhibition.findMany({ where: { status: { not: "DRAFT" } }, select: { slug: true, updatedAt: true } }),
    db.exhibitor.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    entry("", undefined, 1),
    entry("/exhibitors", undefined, 0.9),
    entry("/exhibitions", undefined, 0.8),
    ...exhibitions.map((e) => entry(`/exhibitions/${e.slug}`, e.updatedAt, 0.8)),
    ...exhibitors.map((e) => entry(`/exhibitors/${e.slug}`, e.updatedAt, 0.6)),
  ];
}
