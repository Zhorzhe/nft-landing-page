/**
 * Коренов layout. Истинските <html>/<body> са в:
 *   - src/app/[locale]/layout.tsx  (публичен сайт, bg/en)
 *   - src/app/admin/layout.tsx     (админ панел)
 * Така всяка част има правилния lang атрибут и собствен интерфейс.
 */
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
