"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateExperimentRollout } from "@/app/experiments/actions";

export function RolloutCell({ experimentId, value, multiline = false }: { experimentId: string; value: string | null; multiline?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [savedValue, setSavedValue] = useState(value ?? "");
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const draftRef = useRef(draft);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function save(nextDraft: string) {
    setEditing(false);
    const nextValue = nextDraft.trim();
    if (nextValue === savedValue) return;
    startTransition(async () => {
      await updateExperimentRollout(experimentId, nextValue);
      setSavedValue(nextValue);
      router.refresh();
    });
  }

  function cancel() {
    setDraft(savedValue);
    setEditing(false);
  }

  function openEditor() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.top, left: rect.left, width: Math.max(rect.width, 224) });
    setDraft(savedValue);
    setEditing(true);
  }

  useEffect(() => {
    if (!editing) return;
    textareaRef.current?.focus();

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!overlayRef.current?.contains(target) && !triggerRef.current?.contains(target)) save(draftRef.current);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        aria-label="Раскатка"
        title={savedValue || undefined}
        onClick={openEditor}
        className={`${multiline ? "line-clamp-2 leading-tight" : "overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]"} block w-full min-w-0 rounded border border-transparent px-2 py-1 text-left text-xs text-zinc-700 outline-none hover:border-zinc-200 disabled:opacity-50 ${editing ? "invisible" : ""}`}
      >
        {savedValue || <span className="text-zinc-400">Добавить…</span>}
      </button>
      {editing && anchor && createPortal(
        <div
          ref={overlayRef}
          style={{ position: "fixed", top: anchor.top, left: anchor.left, width: anchor.width }}
          className="z-40"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            rows={4}
            disabled={pending}
            aria-label="Раскатка"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") cancel(); }}
            className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 shadow-lg outline-none focus:border-zinc-900 disabled:opacity-50"
          />
        </div>,
        document.body,
      )}
    </>
  );
}
