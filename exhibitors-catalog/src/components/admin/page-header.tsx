import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/** Съобщение за успех/грешка, показвано след пренасочване (?saved=1 и т.н.). */
export function Notice({ kind = "success", children }: { kind?: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={
        kind === "success"
          ? "mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          : "mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      }
    >
      {children}
    </div>
  );
}

/** Прост страниращ компонент за таблиците в админа. */
export function AdminPagination({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Страници">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-secondary">
          ← Предишна
        </Link>
      ) : (
        <span />
      )}
      <span className="text-gray-600">
        Страница {page} от {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn-secondary">
          Следваща →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
