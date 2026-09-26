import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, can } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/buttons";
import { ExhibitorForm } from "../exhibitor-form";
import { saveExhibitor, deleteExhibitor } from "../actions";
import { getExhibitorFormOptions } from "../form-options";

export const metadata = { title: "Редакция на изложител" };

export default async function EditExhibitorPage(props: PageProps<"/admin/exhibitors/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [ex, options] = await Promise.all([
    db.exhibitor.findUnique({
      where: { id },
      include: { categories: true, participations: true },
    }),
    getExhibitorFormOptions(),
  ]);
  if (!ex) notFound();

  return (
    <>
      <PageHeader
        title={ex.companyName}
        back={{ href: "/admin/exhibitors", label: "Изложители" }}
        action={
          <div className="flex gap-2">
            {ex.isPublished && (
              <a href={`/bg/exhibitors/${ex.slug}`} target="_blank" className="btn-secondary">
                Виж в сайта ↗
              </a>
            )}
            {can.deleteExhibitor(user) && (
              <DeleteButton
                action={deleteExhibitor.bind(null, ex.id)}
                confirmText={`Сигурни ли сте, че искате да изтриете „${ex.companyName}“? Действието е необратимо.`}
              />
            )}
          </div>
        }
      />
      {sp.saved && <Notice>Промените са запазени.</Notice>}
      <ExhibitorForm
        action={saveExhibitor.bind(null, ex.id)}
        initial={{
          ...ex,
          categoryIds: ex.categories.map((c) => c.categoryId),
          participations: ex.participations.map((p) => ({
            exhibitionId: p.exhibitionId,
            boothNumber: p.boothNumber,
            hall: p.hall,
            isFeatured: p.isFeatured,
            isNewExhibitor: p.isNewExhibitor,
          })),
        }}
        {...options}
      />
    </>
  );
}
