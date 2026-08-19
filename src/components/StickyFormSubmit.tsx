export function StickyFormSubmit({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  // A bare floating button inevitably overlaps whatever field is
  // currently scrolled underneath it in a tall form — sticky only fixes
  // *horizontal* alignment (to the card, not the window), it doesn't
  // stop that. An opaque, bordered bar reads as an intentional docked
  // toolbar instead of a glitchy collision with the field text behind
  // it. Negative margins cancel the form's own p-5/sm:p-7 so the bar
  // spans the card's full width edge-to-edge, `rounded-b-xl` matches
  // the card's own corner radius since the bar sits flush at its
  // bottom edge.
  return (
    <div className="sticky bottom-0 z-50 -mx-5 -mb-5 flex justify-end rounded-b-xl border-t border-zinc-200 bg-white px-5 py-4 sm:-mx-7 sm:-mb-7 sm:px-7">
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
