/**
 * Единствена инстанция на Prisma Client за цялото приложение.
 *
 * Prisma 7 използва "driver adapter" — тук това е официалният PostgreSQL
 * адаптер (@prisma/adapter-pg), който работи върху пакета `pg`.
 * В режим на разработка пазим инстанцията в globalThis, за да не се създават
 * нови връзки при всяко hot-reload презареждане.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
