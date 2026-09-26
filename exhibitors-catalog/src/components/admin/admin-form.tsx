"use client";

/**
 * Обвивка за всички форми в админ панела.
 *
 * - Изпраща формата към Server Action чрез useActionState.
 * - НЕ нулира полетата при грешка (React 19 нулира <form action> след
 *   изпращане — затова изпращаме ръчно в onSubmit).
 * - Предава грешките от валидацията на полетата (fields.tsx) чрез контекст.
 */
import { createContext, useActionState, useContext, startTransition } from "react";
import { initialFormState, type FormState } from "./form-state";

type Ctx = { state: FormState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: initialFormState, pending: false });

export const useAdminForm = () => useContext(FormCtx);

export function AdminForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {state.message && (
          <div
            role="alert"
            className={
              state.ok
                ? "mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                : "mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            }
          >
            {state.message}
          </div>
        )}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

/** Бутон за запис — неактивен, докато заявката тече. */
export function SaveButton({ children = "Запази", className = "btn-primary" }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useAdminForm();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Записване…" : children}
    </button>
  );
}
