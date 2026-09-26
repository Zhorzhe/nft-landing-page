import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { Field, Select, Checkbox, Section } from "@/components/admin/fields";
import type { FormState } from "@/components/admin/form-state";

type U = { name: string; email: string; role: "ADMIN" | "EDITOR"; isActive: boolean };

export function UserForm({ action, initial }: { action: (s: FormState, fd: FormData) => Promise<FormState>; initial: U | null }) {
  return (
    <AdminForm action={action} className="max-w-2xl">
      <Section title="Потребител">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Име" name="name" required defaultValue={initial?.name} />
          <Field label="Имейл" name="email" type="email" required defaultValue={initial?.email} autoComplete="off" />
          <Select
            label="Роля"
            name="role"
            defaultValue={initial?.role ?? "EDITOR"}
            hint="Редакторът управлява изложители и импорт, без изтриване и без изложения/категории/потребители."
          >
            <option value="EDITOR">Редактор</option>
            <option value="ADMIN">Администратор</option>
          </Select>
          <Field
            label={initial ? "Нова парола" : "Парола"}
            name="password"
            type="password"
            autoComplete="new-password"
            required={!initial}
            hint={initial ? "Оставете празно, за да не се променя. Минимум 10 символа." : "Минимум 10 символа."}
          />
        </div>
        <Checkbox name="isActive" label="Активен" defaultChecked={initial?.isActive ?? true} hint="Неактивните не могат да влизат." />
        <SaveButton />
      </Section>
    </AdminForm>
  );
}
