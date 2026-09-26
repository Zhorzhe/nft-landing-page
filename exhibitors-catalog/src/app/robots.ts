import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE_URL } from "@/lib/utils";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection(); // генерира се при заявка, за да ползва SITE_URL от средата
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
