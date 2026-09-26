"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { SubmitButton } from "@/components/admin/buttons";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="label">
          Имейл
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" defaultValue={state.email} key={state.email} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Парола
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="Вход…">
        Вход
      </SubmitButton>
    </form>
  );
}
