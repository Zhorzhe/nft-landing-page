/**
 * Оформление на защитената част на админ панела.
 * Всяка страница вътре изисква вписан потребител (requireUser).
 * ВАЖНО: всяко действие (Server Action) също проверява правата самостоятелно.
 */
import { connection } from "next/server";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/permissions";
import { NavLink } from "./nav-link";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requireUser();

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-brand-800 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <p className="text-[11px] tracking-widest text-brand-200 uppercase">МПП · Админ</p>
            <p className="font-bold">Каталог на изложители</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          <NavLink href="/admin">Табло</NavLink>
          <NavLink href="/admin/exhibitors">Изложители</NavLink>
          <NavLink href="/admin/exhibitions">Изложения</NavLink>
          <NavLink href="/admin/categories">Категории</NavLink>
          <NavLink href="/admin/import">Импорт</NavLink>
          {user.role === "ADMIN" && <NavLink href="/admin/users">Потребители</NavLink>}
        </nav>
        <div className="hidden border-t border-brand-700 p-4 text-sm md:absolute md:bottom-0 md:block md:w-60">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-brand-200">
            {user.email} · {user.role === "ADMIN" ? "Администратор" : "Редактор"}
          </p>
          <div className="mt-3 flex gap-3">
            <a href="/bg" target="_blank" className="text-xs text-brand-100 underline">
              Публичен сайт ↗
            </a>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button className="text-xs text-brand-100 underline">Изход</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {children}
        {/* Изход на мобилни устройства */}
        <form
          className="mt-10 border-t pt-4 text-sm md:hidden"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <span className="text-gray-500">{user.email} · </span>
          <button className="text-brand-600 underline">Изход</button>
        </form>
      </main>
    </div>
  );
}
