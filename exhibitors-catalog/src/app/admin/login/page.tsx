import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase">
          Международен Панаир Пловдив
        </p>
        <h1 className="mt-1 mb-6 text-xl font-bold">Каталог на изложители — вход</h1>
        <LoginForm />
      </div>
    </main>
  );
}
