export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{title}</h2>
      {children}
    </section>
  );
}
