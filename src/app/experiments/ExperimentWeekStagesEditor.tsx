"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Columns3, List } from "lucide-react";
import { addNextExperimentWeek, deleteExperimentWeek, setExperimentWeekStage } from "./actions";
import { STAGE_BADGE_CLASSES, STAGE_BAR_CLASSES, STAGE_ICONS, STAGE_LABELS, STAGE_ORDER } from "@/lib/experiment";
import { formatWeekLabel, getISOWeekNumber, startOfWeek, toDateParam } from "@/lib/calendar";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { HideFromCalendarModal } from "@/components/HideFromCalendarModal";
import { IconSelect } from "@/components/IconSelect";
import { StageOptionsMenu } from "@/components/StageOptionsMenu";
import type { ExperimentStage } from "@/generated/prisma/enums";

type WeekEntry = { weekStartISO: string; stage: ExperimentStage };
type WeekView = "list" | "ribbon";

const WEEK_VIEW_STORAGE_KEY = "experiment-week-view";

// UI-057: a tiny external store instead of `useEffect` + `setState` —
// reading localStorage during render would mismatch the server's
// markup (no `window` there), and setting state from an effect body
// triggers a cascading-render lint error. `useSyncExternalStore`'s
// `getServerSnapshot` cleanly covers the SSR case (falls back to
// "list"), and same-tab writes notify subscribers directly instead of
// relying on the cross-tab-only `storage` event.
let cachedWeekView: WeekView | null = null;
const weekViewListeners = new Set<() => void>();

function getWeekViewSnapshot(): WeekView {
  if (cachedWeekView) return cachedWeekView;
  try {
    const stored = window.localStorage.getItem(WEEK_VIEW_STORAGE_KEY);
    cachedWeekView = stored === "list" ? "list" : "ribbon";
  } catch {
    cachedWeekView = "ribbon";
  }
  return cachedWeekView;
}

function getWeekViewServerSnapshot(): WeekView {
  return "ribbon";
}

function subscribeToWeekView(listener: () => void): () => void {
  weekViewListeners.add(listener);
  return () => weekViewListeners.delete(listener);
}

function setWeekView(next: WeekView): void {
  cachedWeekView = next;
  try {
    window.localStorage.setItem(WEEK_VIEW_STORAGE_KEY, next);
  } catch {
    // Best-effort persistence only.
  }
  weekViewListeners.forEach((listener) => listener());
}

function formatWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const date = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
  return `${date} (${getISOWeekNumber(d)} неделя)`;
}

/**
 * PROD-019: per-week stage editor on the experiment detail card — the
 * same edits the Calendar's week-cells offer, so week-by-week
 * progress can be set from either place, per the user's requirement.
 *
 * UI-057: two interchangeable views of the same `weeks` data — the
 * original row list, and a compact segmented ribbon (one colored
 * block per week, `StageOptionsMenu` on click — the exact popover
 * Calendar's week-cells already use, not a second stage-picker
 * implementation). The chosen view persists in localStorage.
 */
export function ExperimentWeekStagesEditor({
  experimentId,
  experimentName,
  weeks,
}: {
  experimentId: string;
  experimentName: string;
  weeks: WeekEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showHidePrompt, setShowHidePrompt] = useState(false);
  const view = useSyncExternalStore(subscribeToWeekView, getWeekViewSnapshot, getWeekViewServerSnapshot);

  function handleChange(weekStartISO: string, stage: ExperimentStage) {
    startTransition(async () => {
      const { becameDone, error } = await setExperimentWeekStage(experimentId, weekStartISO, stage);
      if (error) return;
      router.refresh();
      if (becameDone) setShowHidePrompt(true);
    });
  }

  function handleAddWeek() {
    startTransition(async () => {
      await addNextExperimentWeek(experimentId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {weeks.length > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setWeekView("list")}
              aria-label="Список"
              aria-pressed={view === "list"}
              title="Список"
              className={`flex size-9 items-center justify-center rounded-full transition-all ${
                view === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <List aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekView("ribbon")}
              aria-label="Лента"
              aria-pressed={view === "ribbon"}
              title="Лента"
              className={`flex size-9 items-center justify-center rounded-full transition-all ${
                view === "ribbon" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <Columns3 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      )}

      {weeks.length === 0 ? (
        <p className="text-sm text-zinc-500">Пока нет недель — добавь первую.</p>
      ) : view === "ribbon" ? (
        <WeekRibbon weeks={weeks} pending={pending} onChange={handleChange} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {weeks.map((w) => (
            <li key={w.weekStartISO} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-zinc-500">
                Неделя от {formatWeek(w.weekStartISO)}
              </span>
              <IconSelect
                value={w.stage}
                options={STAGE_ORDER}
                labels={STAGE_LABELS}
                icon={STAGE_ICONS[w.stage]}
                colorClasses={STAGE_BADGE_CLASSES[w.stage]}
                disabled={pending}
                pending={pending}
                onChange={(next) => handleChange(w.weekStartISO, next)}
              />
              <ConfirmDeleteButton
                triggerLabel="×"
                pendingLabel="…"
                confirmTitle="Удалить неделю?"
                confirmMessage={`Удалить неделю от ${formatWeek(w.weekStartISO)}? Это затронет и отображение на Calendar.`}
                triggerClassName="shrink-0 px-1 text-base leading-none text-zinc-400 hover:text-red-600"
                onConfirm={() => deleteExperimentWeek(experimentId, w.weekStartISO)}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleAddWeek}
        disabled={pending}
        className="w-fit rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-60"
      >
        + Добавить неделю
      </button>

      {showHidePrompt && (
        <HideFromCalendarModal
          experimentId={experimentId}
          experimentName={experimentName}
          onDismiss={() => setShowHidePrompt(false)}
        />
      )}
    </div>
  );
}

/**
 * UI-057: one horizontal bar, one colored block per week entry
 * (chronological, matching `STAGE_BAR_CLASSES` — the same colors
 * Calendar's week-cells use). The current week is unmistakably called
 * out — elevated, ringed, and marked with a dot above it — not just
 * on hover, per the acceptance criteria.
 */
function WeekRibbon({
  weeks,
  pending,
  onChange,
}: {
  weeks: WeekEntry[];
  pending: boolean;
  onChange: (weekStartISO: string, stage: ExperimentStage) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const todayWeekISO = toDateParam(startOfWeek(new Date()));
  const sorted = [...weeks].sort((a, b) => a.weekStartISO.localeCompare(b.weekStartISO));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-1">
        {sorted.map((w) => (
          <span
            key={w.weekStartISO}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-zinc-400"
          >
            {STAGE_LABELS[w.stage]}
          </span>
        ))}
      </div>
      <div className="flex items-stretch gap-1">
        {sorted.map((w, i) => {
          const isCurrent = w.weekStartISO === todayWeekISO;
          const Icon = STAGE_ICONS[w.stage];
          return (
            <div key={w.weekStartISO} className="relative min-w-0 flex-1">
              {isCurrent && (
                <span
                  aria-hidden
                  className="absolute -top-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-zinc-900"
                />
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                title={`${STAGE_LABELS[w.stage]} · Неделя от ${formatWeek(w.weekStartISO)}`}
                aria-label={`${STAGE_LABELS[w.stage]}, неделя от ${formatWeek(w.weekStartISO)}${isCurrent ? ", текущая неделя" : ""}`}
                className={`relative z-0 flex h-9 w-full items-center justify-center rounded-lg transition-[transform,box-shadow] duration-200 ease-out disabled:cursor-wait disabled:opacity-60 ${STAGE_BAR_CLASSES[w.stage]} ${
                  isCurrent
                    ? "z-10 -translate-y-1 shadow-md ring-2 ring-zinc-900 ring-offset-1"
                    : "hover:brightness-110"
                }`}
              >
                <Icon aria-hidden className="size-3.5 text-white/90" />
              </button>
              {openIndex === i && (
                <StageOptionsMenu
                  onSelect={(stage) => {
                    onChange(w.weekStartISO, stage);
                    setOpenIndex(null);
                  }}
                  onClose={() => setOpenIndex(null)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {sorted.map((w) => (
          <span
            key={w.weekStartISO}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-zinc-400"
          >
            {formatWeekLabel(new Date(`${w.weekStartISO}T00:00:00`))}
          </span>
        ))}
      </div>
    </div>
  );
}
