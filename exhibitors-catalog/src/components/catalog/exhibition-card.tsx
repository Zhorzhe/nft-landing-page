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
      className="group flex flex-col rounded-lg border border-t-4 border-[#dfe5ec] border-t-accent-500 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold text-brand-800 group-hover:text-brand-600">{localName(locale, e)}</h3>
        {e.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.logo} alt="" className="size-12 shrink-0 object-contain" loading="lazy" />
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
        <CalendarIcon className="text-brand-600" /> {formatDateRange(e.startDate, e.endDate, locale)}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-[#e6ebf1] pt-4 text-sm">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase",
            state === "ongoing" && "bg-accent-500 text-ink",
            state === "upcoming" && "bg-brand-50 text-brand-700",
            state === "ended" && "bg-gray-100 text-muted",
          )}
        >
          {t(state)}
        </span>
        <span className="font-semibold text-brand-600 group-hover:underline">
          {t("exhibitorsCount", { count: e._count.participations })} →
        </span>
      </div>
    </Link>
  );
}
