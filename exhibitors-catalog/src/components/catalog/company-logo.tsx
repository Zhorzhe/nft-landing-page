/**
 * Лого на фирма. Ако няма качено лого — цветен квадрат с инициалите.
 * Логата вече са оптимизирани при качване (WebP, ≤600px), затова тук
 * използваме обикновен <img> с lazy loading.
 */
import { cn } from "@/lib/utils";

// Приглушени цветове в тон с палитрата на панаира.
const COLORS = ["bg-brand-600", "bg-brand-800", "bg-[#2f6f8f]", "bg-[#3d5a80]", "bg-[#5b6878]", "bg-[#b7791f]"];

function initials(name: string) {
  const words = name
    .replace(/\b(ООД|ЕООД|АД|ЕАД|ЕТ|GmbH|Ltd\.?|S\.?A\.?|S\.r\.l\.|Sp\. z o\.o\.)\b/gi, "")
    .split(/\s+/)
    .filter((w) => /[\p{L}\d]/u.test(w));
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function CompanyLogo({
  src,
  name,
  className,
  priority,
}: {
  src: string | null;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("flex items-center justify-center overflow-hidden rounded-md border border-[#dfe5ec] bg-white p-2", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }
  const color = COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center rounded-md text-2xl font-extrabold tracking-wide text-white uppercase", color, className)}
    >
      {initials(name)}
    </div>
  );
}
