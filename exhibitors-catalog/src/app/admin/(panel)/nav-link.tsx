"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
        active ? "bg-brand-600 text-white shadow-[inset_3px_0_0_var(--color-accent-500)]" : "text-brand-100 hover:bg-brand-700/60 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}
