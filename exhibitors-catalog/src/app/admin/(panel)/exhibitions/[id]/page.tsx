import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader, Notice } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/buttons";
import { ExhibitionForm } from "../exhibition-form";
import { saveExhibition, deleteExhibition } from "../actions";

export const metadata = { title: "Редакция на изложение" };

export default async function EditExhibitionPage(props: PageProps<"/admin/exhibitions/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const ex = await db.exhibition.findUnique({
    where: { id },
    include: { _count: { select: { participations: true } } },
  });
  if (!ex) notFound();
  return (
    <>
      <PageHeader
        title={ex.nameBg}
        description={`${ex._count.participations} изложители`}
        back={{ href: "/admin/exhibitions", label: "Изложения" }}
        action={
          <div className="flex gap-2">
            <Link href={`/admin/exhibitors?exhibition=${ex.id}`} className="btn-secondary">
              Изложители
            </Link>
            <DeleteButton
              action={deleteExhibition.bind(null, ex.id)}
              confirmText={`Изтриване на „${ex.nameBg}“? Ще се премахнат и ${ex._count.participations} участия (щандове). Самите изложители остават.`}
            />
          </div>
        }
      />
      {sp.saved && <Notice>Промените са запазени.</Notice>}
      <ExhibitionForm action={saveExhibition.bind(null, ex.id)} initial={ex} />
    </>
  );
}
