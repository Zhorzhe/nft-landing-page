import Link from "next/link";

/** 404 за адреси извън /bg и /en (напр. грешно написан адрес). */
export default function GlobalNotFound() {
  return (
    <html lang="bg">
      <body className="flex min-h-screen items-center justify-center font-sans">
        <div className="text-center">
          <h1 className="text-2xl font-bold">404</h1>
          <p className="mt-2 text-gray-600">Страницата не е намерена / Page not found</p>
          <Link href="/" className="mt-4 inline-block text-brand-600 underline">
            Начало / Home
          </Link>
        </div>
      </body>
    </html>
  );
}
