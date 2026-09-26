/**
 * След `next build` копира статичните файлове в самостоятелния (standalone)
 * сървър, за да може той да се пусне директно: node .next/standalone/server.js
 * (Next.js не ги копира автоматично.)
 */
import { cpSync, existsSync } from "node:fs";

if (existsSync(".next/standalone")) {
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
  console.log("✓ Статичните файлове са копирани в .next/standalone");
}
