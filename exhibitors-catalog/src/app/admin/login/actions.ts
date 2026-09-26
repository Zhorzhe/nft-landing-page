"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function loginAction(
  _prev: { error?: string; email?: string },
  formData: FormData,
): Promise<{ error?: string; email?: string }> {
  // Връщаме имейла, за да не се налага да се въвежда отново след грешка.
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/admin",
    });
    return {};
  } catch (error) {
    // При успех signIn "хвърля" пренасочване — то трябва да продължи нагоре.
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      if (code === "too_many_attempts")
        return { email, error: "Твърде много неуспешни опити. Опитайте отново след 15 минути." };
      return { email, error: "Грешен имейл или парола." };
    }
    throw error;
  }
}
