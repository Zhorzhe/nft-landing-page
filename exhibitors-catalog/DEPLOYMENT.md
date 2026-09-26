# Пускане в интернет (deployment)

Приложението е стандартно Node.js приложение с база PostgreSQL. Нужни са:

1. **Сървър за приложението** — Node.js 20.9+ (препоръчително 22 LTS).
2. **PostgreSQL 14+** база данни.
3. **Място за качените лога** — диск на сървъра *или* S3-съвместимо хранилище.
4. **Домейн/поддомейн** с HTTPS, напр. `katalog.fair.bg` или `exhibitors.fair.bg`.

---

## Вариант A (препоръчителен): един VPS с Docker

Най-простият за поддръжка вариант с предвидима месечна цена. Всичко (база, сайт,
лога) е на един сървър, който контролирате.

**Сървър:** 2 vCPU, 2–4 GB RAM, 40 GB диск, Ubuntu 24.04 — напр. Hetzner Cloud
(дата-център във Финландия/Германия), DigitalOcean (Франкфурт), или български
доставчик с VPS (напр. SuperHosting, ICN.bg). Ориентировъчно 5–20 €/месец.

```bash
# 1. На сървъра: инсталирайте Docker
curl -fsSL https://get.docker.com | sh

# 2. Качете проекта (git clone) и попълнете настройките
cp .env.example .env
nano .env        # вижте таблицата по-долу; добавете и POSTGRES_PASSWORD=...

# 3. Стартирайте, приложете миграциите и създайте администратора
docker compose up -d --build
docker compose run --rm migrate
docker compose run --rm migrate npm run db:seed
```

Сайтът слуша на `127.0.0.1:3000`. Пред него поставете уеб сървър с HTTPS —
най-лесно с **Caddy** (издава и подновява Let's Encrypt сертификатите автоматично):

```
# /etc/caddy/Caddyfile
katalog.fair.bg {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

**Обновяване на версия:**

```bash
git pull
docker compose up -d --build
docker compose run --rm migrate   # ако има нови миграции
```

> Docker файловете (`Dockerfile`, `docker-compose.yml`) не бяха пуснати в
> средата, в която е написан проектът (там нямаше Docker). Приложението е
> тествано като standalone Node.js сървър (`npm run build && npm start`) с
> PostgreSQL 16 — това е същото, което изпълнява Docker образът. Направете
> пробно пускане на тестов сървър преди продукция.

### Без Docker (Node.js директно на сървъра)

```bash
npm ci
npm run db:deploy && npm run db:seed
npm run build
npm start          # node .next/standalone/server.js — пуснете го чрез systemd или pm2
```

## Вариант B: управлявани услуги (без поддръжка на сървър)

| Компонент | Пример | Бележки |
|---|---|---|
| Приложение | Vercel, Railway, Render | Vercel няма постоянен диск → задължително `STORAGE_DRIVER=s3`. |
| База | Neon, Supabase, Railway Postgres, AWS RDS | Изберете регион в ЕС (Франкфурт). |
| Лога | Cloudflare R2, AWS S3, DigitalOcean Spaces | R2 няма такси за трафик. |

Миграциите се пускат с `npm run db:deploy` (напр. като build команда:
`npm run db:deploy && npm run build`).

---

## Environment variables

| Променлива | Задължителна | Описание |
|---|:-:|---|
| `DATABASE_URL` | ✓ | Връзка към PostgreSQL: `postgresql://user:pass@host:5432/db?schema=public` |
| `AUTH_SECRET` | ✓ | Таен ключ за сесиите. Генерирайте с `openssl rand -base64 32`. Смяната му изписва всички потребители. |
| `AUTH_TRUST_HOST` | ✓ | `true` зад reverse proxy (Caddy/Nginx) или на Vercel. |
| `SITE_URL` | ✓ | Публичният адрес, напр. `https://katalog.fair.bg` (sitemap, canonical, Open Graph). Чете се при стартиране на сървъра. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | за seed | Първият администратор (`npm run db:seed`). Паролата — мин. 10 символа; сменете я след първи вход. |
| `STORAGE_DRIVER` | | `local` (по подразбиране) или `s3`. |
| `UPLOAD_DIR` | при `local` | **Абсолютен** път до папката с лога, извън проекта (напр. `/var/lib/fair-catalog/uploads`). В Docker е `/app/uploads` (volume). |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | при `s3` | Данни за хранилището; `S3_PUBLIC_URL` е публичният адрес на bucket-а (или CDN пред него). |
| `POSTGRES_PASSWORD` | само docker-compose | Парола на базата в контейнера. |

## Домейн

Най-лесно е поддомейн на `fair.bg`. При администратора на DNS зоната добавете:

- при VPS: запис **A** `katalog` → IP адреса на сървъра;
- при Vercel/Railway/Render: запис **CNAME** `katalog` → адреса, който дава услугата.

След това регистрирайте сайта в **Google Search Console** и подайте
`https://katalog.fair.bg/sitemap.xml`. Ако старите адреси на `fairinfo.fair.bg`
са индексирани, помислете за 301 пренасочване от стария каталог към новия.

## Архивиране (задължително)

- **База:** ежедневен `pg_dump`, напр. с cron:
  `docker compose exec -T db pg_dump -U fair fair_catalog | gzip > /backup/db-$(date +%F).sql.gz`
  (управляваните бази като Neon/Supabase/RDS правят архиви автоматично).
- **Лога:** архивирайте папката `UPLOAD_DIR` (или Docker volume-а `uploads`).
  При S3/R2 включете versioning на bucket-а.
- Пазете архивите извън сървъра и проверявайте периодично, че се възстановяват.

## Проверка след пускане

- [ ] `https://.../bg` и `https://.../en` се отварят; `/` пренасочва към `/bg`.
- [ ] Вход в `/admin` и **смяна на паролата** на първия администратор.
- [ ] Създаване на изложение, категории и един изложител с лого → вижда се в каталога.
- [ ] `https://.../sitemap.xml` съдържа адреси с правилния домейн.
- [ ] Импорт на пробен файл (шаблон от `/admin/import`).
- [ ] Архивирането работи.
- [ ] По желание: `npm run test:e2e` срещу тестова инсталация с демо данни.

## Миграция от стария каталог (fairinfo.fair.bg)

1. Експортирайте изложителите от старата система в Excel/CSV (по един файл на
   изложение или с колона „Изложение“).
2. В админ панела създайте изложенията и категориите.
3. `/admin/import` → изберете файла и изложението → „Провери файла“ → прегледайте
   грешките → „Импортирай“. Повторният импорт на същия файл е безопасен —
   съществуващите фирми се обновяват, не се дублират.
