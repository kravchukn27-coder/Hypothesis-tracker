"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createHypothesis } from "./actions";
import { HypothesisForm } from "./HypothesisForm";
import { MotionDialog } from "@/components/MotionDialog";
import type { FunnelLevel } from "@/generated/prisma/client";

export function NewHypothesisModal({ funnelLevels }: { funnelLevels: FunnelLevel[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        + Новая гипотеза
      </button>

      {open && (
        <MotionDialog
          onDismiss={() => setOpen(false)}
          labelledBy="new-hypothesis-title"
          panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/70 bg-white/92 shadow-[0_18px_45px_rgba(24,24,27,0.18)] backdrop-blur-md"
        >
          {({ dismiss }) => (
            <>
              <div className="flex items-center justify-between px-6 pb-4 pt-6 sm:px-8">
                <h2 id="new-hypothesis-title" className="text-xl font-semibold text-zinc-900">
                  Новая гипотеза
                </h2>
                <button
                  type="button"
                  onClick={() => dismiss()}
                  aria-label="Закрыть"
                  className="-mr-2 -mt-2 rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
              <HypothesisForm action={createHypothesis} funnelLevels={funnelLevels} submitLabel="Создать" />
            </>
          )}
        </MotionDialog>
      )}
    </>
  );
}
