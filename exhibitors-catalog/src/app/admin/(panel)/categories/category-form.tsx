import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { Field, Select, Section } from "@/components/admin/fields";
import type { FormState } from "@/components/admin/form-state";
import type { Category } from "@/generated/prisma/client";

export function CategoryForm({
  action,
  initial,
  parents,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  initial: Category | null;
  parents: { id: string; nameBg: string }[];
}) {
  return (
    <AdminForm action={action} className="max-w-2xl">
      <Section title="Категория">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Име (BG)" name="nameBg" required defaultValue={initial?.nameBg} />
          <Field label="Име (EN)" name="nameEn" defaultValue={initial?.nameEn ?? ""} />
          <Select label="Родителска категория" name="parentId" defaultValue={initial?.parentId ?? ""}>
            <option value="">— основна категория —</option>
            {parents
              .filter((p) => p.id !== initial?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameBg}
                </option>
              ))}
          </Select>
          <Field
            label="Подредба"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={initial?.sortOrder ?? 0}
            hint="По-малкото число се показва по-напред."
          />
        </div>
        <Field label="Адрес (slug)" name="slug" defaultValue={initial?.slug ?? ""} hint="Празно = автоматично." />
        <SaveButton />
      </Section>
    </AdminForm>
  );
}
