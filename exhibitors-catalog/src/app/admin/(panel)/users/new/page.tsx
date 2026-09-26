import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "../user-form";
import { saveUser } from "../actions";

export const metadata = { title: "Нов потребител" };

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Нов потребител" back={{ href: "/admin/users", label: "Потребители" }} />
      <UserForm action={saveUser.bind(null, null)} initial={null} />
    </>
  );
}
