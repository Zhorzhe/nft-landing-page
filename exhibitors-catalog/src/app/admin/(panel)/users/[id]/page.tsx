import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "../user-form";
import { saveUser } from "../actions";

export const metadata = { title: "Редакция на потребител" };

export default async function EditUserPage(props: PageProps<"/admin/users/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();
  return (
    <>
      <PageHeader title={user.name} back={{ href: "/admin/users", label: "Потребители" }} />
      <UserForm action={saveUser.bind(null, user.id)} initial={user} />
    </>
  );
}
