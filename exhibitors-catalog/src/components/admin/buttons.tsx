"use client";

/** Бутони, които реагират на състоянието на формата (изпращане, потвърждение). */
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Записване…",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Бутон за изтриване с потвърждение. `action` е Server Action,
 * свързан предварително с ID-то (action.bind(null, id)).
 */
export function DeleteButton({
  action,
  confirmText,
  children = "Изтрий",
  className = "btn-danger",
}: {
  action: () => Promise<void>;
  confirmText: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <SubmitButton className={className} pendingText="Изтриване…">
        {children}
      </SubmitButton>
    </form>
  );
}
