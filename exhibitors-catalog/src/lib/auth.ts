/**
 * Автентикация за админ панела (Auth.js / NextAuth v5).
 *
 * - Вход с имейл и парола; паролите се пазят само като bcrypt хеш.
 * - Сесията е подписан JWT в httpOnly бисквитка, валидна 8 часа.
 * - Ролята се пази в сесията, но при всяко действие в админ панела
 *   правата се проверяват отново в базата (src/lib/permissions.ts), така че
 *   деактивиран потребител губи достъп веднага.
 */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import type { Role } from "@/generated/prisma/client";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

// Проста защита срещу налучкване на пароли: до 10 неуспешни опита за 15 мин.
// на имейл. Пази се в паметта на процеса — достатъчно за един сървър.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const now = Date.now();
        const f = failures.get(email);
        if (f && f.until > now && f.count >= 10) throw new TooManyAttempts();

        const user = await db.user.findUnique({ where: { email } });
        const ok = user?.isActive && (await bcrypt.compare(password, user.passwordHash));
        if (!user || !ok) {
          const entry = f && f.until > now ? f : { count: 0, until: now + WINDOW_MS };
          entry.count++;
          failures.set(email, entry);
          return null;
        }
        failures.delete(email);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
