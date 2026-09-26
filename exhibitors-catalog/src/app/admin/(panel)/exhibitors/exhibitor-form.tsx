"use client";

/**
 * Форма за добавяне/редакция на изложител.
 * Съдържа: основни данни, описания (BG/EN), контакти, социални мрежи,
 * лого (с преглед преди запис), категории и участия в изложения
 * (с щанд, палата и етикети "Акцент" / "Нов изложител").
 */
import { useState } from "react";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { Field, TextArea, Select, Checkbox, Section } from "@/components/admin/fields";
import type { FormState } from "@/components/admin/form-state";

type Participation = {
  exhibitionId: string;
  boothNumber: string | null;
  hall: string | null;
  isFeatured: boolean;
  isNewExhibitor: boolean;
};

export type ExhibitorFormData = {
  companyName: string;
  companyNameEn: string | null;
  slug: string;
  logo: string | null;
  descriptionBg: string | null;
  descriptionEn: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  x: string | null;
  isPublished: boolean;
  categoryIds: string[];
  participations: Participation[];
};

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  initial: ExhibitorFormData | null;
  exhibitions: { id: string; nameBg: string; status: string }[];
  categories: { id: string; nameBg: string; children: { id: string; nameBg: string }[] }[];
  countries: { code: string; name: string }[];
};

const STATUS_LABEL: Record<string, string> = { ACTIVE: "", DRAFT: " (чернова)", ARCHIVED: " (архив)" };

export function ExhibitorForm({ action, initial, exhibitions, categories, countries }: Props) {
  const [participations, setParticipations] = useState<Participation[]>(initial?.participations ?? []);
  const [preview, setPreview] = useState<string | null>(initial?.logo ?? null);

  const free = exhibitions.filter((e) => !participations.some((p) => p.exhibitionId === e.id));
  const update = (i: number, patch: Partial<Participation>) =>
    setParticipations((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <AdminForm action={action} className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Section title="Основни данни">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Име на фирмата" name="companyName" required defaultValue={initial?.companyName} />
            <Field
              label="Име на латиница / английски"
              name="companyNameEn"
              defaultValue={initial?.companyNameEn ?? ""}
              hint="Показва се в английската версия, ако е попълнено."
            />
          </div>
          <Field
            label="Адрес на страницата (slug)"
            name="slug"
            defaultValue={initial?.slug ?? ""}
            hint="Оставете празно за автоматично генериране от името. Напр. agro-shtit-ood"
          />
          <TextArea label="Описание (BG)" name="descriptionBg" defaultValue={initial?.descriptionBg ?? ""} />
          <TextArea label="Описание (EN)" name="descriptionEn" defaultValue={initial?.descriptionEn ?? ""} />
        </Section>

        <Section title="Контакти">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Държава" name="country" defaultValue={initial?.country ?? "BG"}>
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Field label="Град" name="city" defaultValue={initial?.city ?? ""} />
            <Field label="Адрес" name="address" defaultValue={initial?.address ?? ""} className="sm:col-span-2" />
            <Field label="Уебсайт" name="website" defaultValue={initial?.website ?? ""} placeholder="www.firma.bg" />
            <Field label="Имейл" name="email" type="email" defaultValue={initial?.email ?? ""} />
            <Field label="Телефон" name="phone" defaultValue={initial?.phone ?? ""} placeholder="+359 …" />
          </div>
        </Section>

        <Section title="Социални мрежи">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook" name="facebook" defaultValue={initial?.facebook ?? ""} placeholder="https://facebook.com/…" />
            <Field label="Instagram" name="instagram" defaultValue={initial?.instagram ?? ""} />
            <Field label="LinkedIn" name="linkedin" defaultValue={initial?.linkedin ?? ""} />
            <Field label="YouTube" name="youtube" defaultValue={initial?.youtube ?? ""} />
            <Field label="X (Twitter)" name="x" defaultValue={initial?.x ?? ""} />
          </div>
        </Section>

        <Section title="Участия в изложения">
          <input type="hidden" name="participations" value={JSON.stringify(participations)} />
          {participations.length === 0 && (
            <p className="text-sm text-gray-500">Изложителят още не е добавен към изложение.</p>
          )}
          <div className="space-y-3">
            {participations.map((p, i) => {
              const ex = exhibitions.find((e) => e.id === p.exhibitionId);
              return (
                <div key={p.exhibitionId} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {ex?.nameBg ?? "?"}
                      <span className="text-gray-500">{STATUS_LABEL[ex?.status ?? ""]}</span>
                    </p>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => setParticipations((l) => l.filter((_, idx) => idx !== i))}
                    >
                      Премахни
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="text-sm">
                      <span className="label">Щанд</span>
                      <input
                        className="input"
                        value={p.boothNumber ?? ""}
                        onChange={(e) => update(i, { boothNumber: e.target.value || null })}
                        placeholder="B16"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="label">Палата</span>
                      <input
                        className="input"
                        value={p.hall ?? ""}
                        onChange={(e) => update(i, { hall: e.target.value || null })}
                        placeholder="Палата 5"
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand-600"
                        checked={p.isFeatured}
                        onChange={(e) => update(i, { isFeatured: e.target.checked })}
                      />
                      Акцент (Featured)
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand-600"
                        checked={p.isNewExhibitor}
                        onChange={(e) => update(i, { isNewExhibitor: e.target.checked })}
                      />
                      Нов изложител
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          {free.length > 0 && (
            <select
              className="input max-w-sm"
              value=""
              aria-label="Добави към изложение"
              onChange={(e) => {
                if (!e.target.value) return;
                setParticipations((l) => [
                  ...l,
                  { exhibitionId: e.target.value, boothNumber: null, hall: null, isFeatured: false, isNewExhibitor: false },
                ]);
              }}
            >
              <option value="">+ Добави към изложение…</option>
              {free.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nameBg}
                  {STATUS_LABEL[e.status]}
                </option>
              ))}
            </select>
          )}
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Публикуване">
          <Checkbox
            name="isPublished"
            label="Публикуван в каталога"
            defaultChecked={initial?.isPublished ?? true}
            hint="Непубликуваните изложители се виждат само в админ панела."
          />
          <SaveButton className="btn-primary w-full" />
        </Section>

        <Section title="Лого">
          <div className="flex aspect-[3/2] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Лого" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm text-gray-400">Няма лого</span>
            )}
          </div>
          <Field
            label="Качи ново лого"
            name="logo"
            type="file"
            accept="image/*"
            hint="JPG, PNG, WebP или SVG до 8 MB. Автоматично се смалява и компресира."
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
          {initial?.logo && <Checkbox name="removeLogo" label="Премахни текущото лого" />}
        </Section>

        <Section title="Категории (бранш)">
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {categories.length === 0 && (
              <p className="text-sm text-gray-500">Първо добавете категории от меню „Категории“.</p>
            )}
            {categories.map((c) => (
              <div key={c.id}>
                <Checkbox
                  name="categoryIds"
                  label={c.nameBg}
                  defaultChecked={initial?.categoryIds.includes(c.id)}
                  value={c.id}
                />
                {c.children.length > 0 && (
                  <div className="mt-1 ml-6 space-y-1">
                    {c.children.map((ch) => (
                      <Checkbox
                        key={ch.id}
                        name="categoryIds"
                        label={ch.nameBg}
                        defaultChecked={initial?.categoryIds.includes(ch.id)}
                        value={ch.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AdminForm>
  );
}
