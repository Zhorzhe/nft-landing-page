import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm rounded-lg border-t-4 border-t-brand-600 bg-white p-8 shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ifp-logo.png" alt="Международен панаир Пловдив" width={715} height={87} className="h-9 w-auto" />
        <h1 className="mt-6 mb-6 border-l-4 border-accent-500 pl-3 text-xl font-bold text-brand-800">
          Каталог на изложители — вход
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
