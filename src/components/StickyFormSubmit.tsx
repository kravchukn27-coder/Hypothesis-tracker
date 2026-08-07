export function StickyFormSubmit({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-6 lg:right-8 lg:left-auto">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Сохраняем..." : label}
      </button>
    </div>
  );
}
