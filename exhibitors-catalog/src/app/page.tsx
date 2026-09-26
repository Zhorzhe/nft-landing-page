import { redirect } from "next/navigation";

/** "/" обикновено се пренасочва от proxy.ts; това е резервен вариант. */
export default function RootPage() {
  redirect("/bg");
}
