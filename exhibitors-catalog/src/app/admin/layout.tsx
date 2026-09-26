import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Админ панел", template: "%s · Админ · Каталог на изложители" },
  robots: { index: false, follow: false }, // админ панелът не се индексира
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
