"use client";

/**
 * GET форма за филтрите на каталога.
 * - При промяна на чекбокс/радио/select филтрите се прилагат веднага
 *   (клиентска навигация, без презареждане).
 * - Полето за търсене се прилага при Enter или бутона "Търси".
 * - Без JavaScript формата работи като обикновена GET форма.
 * Докато се зареждат новите резултати, формата получава data-pending.
 */
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilterIcon } from "@/components/icons";

function toQuery(form: HTMLFormElement) {
  const sp = new URLSearchParams();
  for (const [k, v] of new FormData(form)) {
    if (typeof v === "string" && v.trim() !== "") sp.append(k, v.trim());
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function AutoSubmitForm({
  action,
  children,
  className,
}: {
  action: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (form: HTMLFormElement) =>
    startTransition(() => router.push(action + toQuery(form), { scroll: false }));

  return (
    <form
      action={action}
      method="get"
      role="search"
      className={`group ${className ?? ""}`}
      data-pending={pending || undefined}
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement;
        if (el.type === "search" || el.type === "text") return;
        go(e.currentTarget);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
    >
      {children}
    </form>
  );
}

/** На мобилни устройства филтрите са скрити зад бутон; на десктоп са винаги видими. */
export function FiltersPanel({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("catalog");
  return (
    <>
      <button
        type="button"
        className="btn-secondary w-full lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FilterIcon /> {t("showFilters")}
        {activeCount > 0 && (
          <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{activeCount}</span>
        )}
      </button>
      <div className={open ? "block" : "hidden lg:block"}>{children}</div>
    </>
  );
}
