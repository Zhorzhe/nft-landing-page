"use client";

/**
 * Малки компоненти за полетата във формите на админ панела.
 * Показват етикет, подсказка и грешка от валидацията под полето.
 */
import { cn } from "@/lib/utils";
import { useAdminForm } from "./admin-form";

/** Грешка за полето: подадена изрично или от контекста на AdminForm. */
function useFieldError(name: string, explicit?: string) {
  const { state } = useAdminForm();
  return explicit ?? state.errors?.[name];
}

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
};

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...input
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  error = useFieldError(name, error);
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
        {input.required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        className={cn("input", error && "border-red-500")}
        aria-invalid={!!error}
        {...input}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  className,
  ...input
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  error = useFieldError(name, error);
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={5}
        className={cn("input", error && "border-red-500")}
        aria-invalid={!!error}
        {...input}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  error,
  hint,
  className,
  children,
  ...input
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  error = useFieldError(name, error);
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select id={name} name={name} className={cn("input", error && "border-red-500")} {...input}>
        {children}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  hint,
  value,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
  value?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-gray-300 accent-brand-600"
      />
      <span>
        <span className="font-medium text-gray-800">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
