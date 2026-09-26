-- Бързо търсене по име на фирма (частично съвпадение, без значение за регистъра).
-- pg_trgm позволява GIN индекс, който ускорява ILIKE '%текст%' заявки,
-- включително за кирилица. Индексите са описани и в schema.prisma.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Exhibitor_companyName_trgm_idx" ON "Exhibitor" USING GIN ("companyName" gin_trgm_ops);

CREATE INDEX "Exhibitor_companyNameEn_trgm_idx" ON "Exhibitor" USING GIN ("companyNameEn" gin_trgm_ops);
