import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { Field, TextArea, Select, Checkbox, Section } from "@/components/admin/fields";
import type { FormState } from "@/components/admin/form-state";
import type { Exhibition } from "@/generated/prisma/client";

const toInputDate = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function ExhibitionForm({
  action,
  initial,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  initial: Exhibition | null;
}) {
  return (
    <AdminForm action={action} className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Section title="Данни за изложението">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Име (BG)" name="nameBg" required defaultValue={initial?.nameBg} placeholder="Агра 2027" />
            <Field label="Име (EN)" name="nameEn" defaultValue={initial?.nameEn ?? ""} placeholder="Agra 2027" />
            <Field label="Начална дата" name="startDate" type="date" required defaultValue={toInputDate(initial?.startDate)} />
            <Field label="Крайна дата" name="endDate" type="date" required defaultValue={toInputDate(initial?.endDate)} />
            <Field label="Място / палати" name="venue" defaultValue={initial?.venue ?? ""} />
            <Field label="Сайт на изложението" name="website" defaultValue={initial?.website ?? ""} />
          </div>
          <Field
            label="Адрес на страницата (slug)"
            name="slug"
            defaultValue={initial?.slug ?? ""}
            hint="Оставете празно за автоматично генериране. Напр. agra-2027"
          />
          <TextArea label="Описание (BG)" name="descriptionBg" defaultValue={initial?.descriptionBg ?? ""} />
          <TextArea label="Описание (EN)" name="descriptionEn" defaultValue={initial?.descriptionEn ?? ""} />
        </Section>
      </div>
      <div className="space-y-6">
        <Section title="Статус">
          <Select
            label="Статус"
            name="status"
            defaultValue={initial?.status ?? "DRAFT"}
            hint="Чернова: скрито. Активно: в каталога и филтрите. Архив: само в архива."
          >
            <option value="DRAFT">Чернова</option>
            <option value="ACTIVE">Активно</option>
            <option value="ARCHIVED">Архивирано</option>
          </Select>
          <SaveButton className="btn-primary w-full" />
        </Section>
        <Section title="Лого на изложението">
          {initial?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initial.logo} alt="" className="mx-auto max-h-32 object-contain" />
          )}
          <Field label="Качи лого" name="logo" type="file" accept="image/*" hint="Автоматично се оптимизира." />
          {initial?.logo && <Checkbox name="removeLogo" label="Премахни логото" />}
        </Section>
      </div>
    </AdminForm>
  );
}
