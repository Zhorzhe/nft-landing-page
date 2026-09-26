# =============================================================================
# Docker образ за production. Вижте DEPLOYMENT.md.
#   docker compose up -d --build
# =============================================================================
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- Зависимости (+ prisma generate чрез postinstall) ---
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# --- Build ---
# Този етап се използва и за миграциите (съдържа Prisma CLI).
FROM deps AS builder
COPY . .
RUN npm run build

# --- Минимален образ, който се пуска ---
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
RUN useradd --system --uid 1001 nextjs && mkdir -p /app/uploads && chown nextjs /app/uploads
COPY --from=builder --chown=nextjs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
