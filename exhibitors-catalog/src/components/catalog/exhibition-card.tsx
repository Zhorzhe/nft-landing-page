import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CalendarIcon } from "@/components/icons";
import { localName } from "@/lib/i18n-fields";
import { formatDateRange, cn } from "@/lib/utils";

type E = {
  id: string;
  slug: string;
  nameBg: string;
  nameEn: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  logo: string | null;
  _count: { participations: number };
};

/** Карта на изложение: име, дати, статус (предстои/в момента), брой изложители. */
export async function ExhibitionCard({ exhibition: e, locale }: { exhibition: E; locale: string }) {
  const t = await getTranslations("exhibitions");
  const now = new Date();
  const endOfLastDay = new Date(e.endDate.getTime() + 24 * 60 * 60 * 1000);
  const state = now < e.startDate ? "upcoming" : now < endOfLastDay ? "ongoing" : "ended";

  return (
    <Link
      href={`/exhibitions/${e.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-700">{localName(locale, e)}</h3>
        {e.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.logo} alt="" className="size-12 shrink-0 object-contain" loading="lazy" />
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
        <CalendarIcon className="text-gray-400" /> {formatDateRange(e.startDate, e.endDate, locale)}
      </p>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            state === "ongoing" && "bg-emerald-100 text-emerald-800",
            state === "upcoming" && "bg-brand-100 text-brand-800",
            state === "ended" && "bg-gray-100 text-gray-600",
          )}
        >
          {t(state)}
        </span>
        <span className="font-medium text-brand-600">
          {t("exhibitorsCount", { count: e._count.participations })} →
        </span>
      </div>
    </Link>
  );
}
