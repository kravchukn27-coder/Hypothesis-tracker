import { requireUserPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/prisma";

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ user?: string; event?: string; from?: string; to?: string }> }) {
  await requireUserPage();
  const { user, event, from, to } = await searchParams;
  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);
  const dateFilter = fromDate || toDate ? { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } : undefined;
  const [users, audits, errors] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      where: { ...(user ? { userId: user } : {}), ...(event ? { event: { contains: event, mode: "insensitive" } } : {}), ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
    prisma.errorEvent.findMany({
      where: { ...(user ? { lastUserId: user } : {}), ...(event ? { event: { contains: event, mode: "insensitive" } } : {}), ...(dateFilter ? { lastSeenAt: dateFilter } : {}) },
      orderBy: { lastSeenAt: "desc" }, take: 100,
    }),
  ]);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const rows = [
    ...audits.map((item) => ({ id: `audit-${item.id}`, kind: "Audit", event: item.event, userId: item.userId, metadata: item.metadata, date: item.createdAt, count: null })),
    ...errors.map((item) => ({ id: `error-${item.id}`, kind: "Error", event: item.event, userId: item.lastUserId, metadata: item.lastMetadata, date: item.lastSeenAt, count: item.count })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return <main className="mx-auto w-full max-w-6xl px-6 py-8">
    <h1 className="text-2xl font-semibold">События</h1>
    <p className="mt-1 text-sm text-zinc-600">Аудит действий и серверные ошибки.</p>
    <form className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4">
      <select aria-label="Пользователь" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={user ?? ""} name="user"><option value="">Все пользователи</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <input aria-label="Событие" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={event ?? ""} name="event" placeholder="Событие" />
      <input aria-label="С даты" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={from ?? ""} name="from" type="date" />
      <div className="flex gap-2"><input aria-label="По дату" className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={to ?? ""} name="to" type="date" /><button className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white" type="submit">Фильтр</button></div>
    </form>
    <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-zinc-600"><tr><th className="px-4 py-3">Время</th><th className="px-4 py-3">Тип</th><th className="px-4 py-3">Событие</th><th className="px-4 py-3">Пользователь</th><th className="px-4 py-3">Данные</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr className="border-t border-zinc-200 align-top" key={row.id}><td className="whitespace-nowrap px-4 py-3 text-zinc-600">{row.date.toLocaleString("ru-RU")}</td><td className="px-4 py-3">{row.kind}{row.count ? ` ×${row.count}` : ""}</td><td className="px-4 py-3 font-medium">{row.event}</td><td className="px-4 py-3">{row.userId ? userNames.get(row.userId) ?? row.userId : "—"}</td><td className="max-w-md break-words px-4 py-3 font-mono text-xs text-zinc-600">{row.metadata ? JSON.stringify(row.metadata) : "—"}</td></tr>) : <tr><td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>Событий не найдено.</td></tr>}</tbody></table></div>
  </main>;
}
