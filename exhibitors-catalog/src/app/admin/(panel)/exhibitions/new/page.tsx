import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { ExhibitionForm } from "../exhibition-form";
import { saveExhibition } from "../actions";

export const metadata = { title: "Ново изложение" };

export default async function NewExhibitionPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Ново изложение" back={{ href: "/admin/exhibitions", label: "Изложения" }} />
      <ExhibitionForm action={saveExhibition.bind(null, null)} initial={null} />
    </>
  );
}
