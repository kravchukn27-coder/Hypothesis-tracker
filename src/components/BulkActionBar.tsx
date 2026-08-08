"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { useSelection } from "@/components/BulkSelection";

export function BulkActionBar({
  itemLabelOne,
  itemLabelMany,
  onArchive,
  onDelete,
}: {
  /** Plain strings (not a function — this prop crosses the server/client
   * boundary) e.g. "гипотеза" / "гипотез". */
  itemLabelOne: string;
  itemLabelMany: string;
  onArchive: (ids: string[]) => Promise<{ error?: string } | void>;
  onDelete: (ids: string[]) => Promise<{ error?: string } | void>;
}) {
  const router = useRouter();
  const { active, selected, clear } = useSelection();

  if (!active || selected.size === 0) return null;

  const ids = Array.from(selected);
  const count = ids.length;
  const itemLabel = count === 1 ? itemLabelOne : itemLabelMany;

  function handleDone() {
    clear();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
      <span className="font-medium text-zinc-700">
        Выбрано: {count} {itemLabel}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <ConfirmDeleteButton
          onConfirm={() => onArchive(ids)}
          onSuccess={handleDone}
          confirmTitle="Архивировать выбранное?"
          confirmMessage={`${count} ${itemLabel} будет архивировано.`}
          triggerLabel="Архивировать"
          pendingLabel="Архивируем..."
          confirmButtonClassName="bg-zinc-900 hover:bg-zinc-700"
          triggerClassName="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        />
        <ConfirmDeleteButton
          onConfirm={() => onDelete(ids)}
          onSuccess={handleDone}
          confirmTitle="Удалить выбранное?"
          confirmMessage={`${count} ${itemLabel} будет удалено без возможности восстановления.`}
          triggerLabel="Удалить"
          pendingLabel="Удаляем..."
          triggerClassName="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        />
      </div>
    </div>
  );
}
