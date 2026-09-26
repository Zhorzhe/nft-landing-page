import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { ExhibitorForm } from "../exhibitor-form";
import { saveExhibitor } from "../actions";
import { getExhibitorFormOptions } from "../form-options";

export const metadata = { title: "Нов изложител" };

export default async function NewExhibitorPage() {
  await requireUser();
  const options = await getExhibitorFormOptions();
  return (
    <>
      <PageHeader title="Нов изложител" back={{ href: "/admin/exhibitors", label: "Изложители" }} />
      <ExhibitorForm action={saveExhibitor.bind(null, null)} initial={null} {...options} />
    </>
  );
}
