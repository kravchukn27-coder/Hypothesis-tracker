import Link from "next/link";
import { toDateParam } from "@/lib/calendar";

/**
 * UI-040: a dated experiment whose weeks fall entirely outside the
 * current window. Same card look as `UndatedRow`, but a plain link
 * (no drag-and-drop — these experiments are already scheduled) that
 * jumps the timeline to the experiment's earliest week, reusing the
 * `experimentId` + `start` mechanism from UI-030.
 */
export function OutOfRangeRow({
  experimentId,
  name,
  jumpStart,
  highlighted = false,
}: {
  experimentId: string;
  name: string;
  jumpStart: Date;
  highlighted?: boolean;
}) {
  return (
    <li>
      <Link
        data-highlighted={highlighted || undefined}
        href={`/calendar?experimentId=${experimentId}&start=${toDateParam(jumpStart)}`}
        title={`${name} — перейти к неделям эксперимента`}
        className="highlight-calendar-card block w-full break-words rounded-md border border-amber-200/80 bg-amber-50 py-1.5 pl-2.5 pr-3 text-[13px] font-medium leading-tight text-amber-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-px hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-sm"
      >
        {name}
      </Link>
    </li>
  );
}
