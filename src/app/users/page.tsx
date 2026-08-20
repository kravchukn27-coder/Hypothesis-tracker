import { InviteForm } from "./InviteForm";
import { deactivateUser } from "./actions";
import { requireUserPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/prisma";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export default async function UsersPage() {
  await requireUserPage();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, passwordHash: true, invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Пользователи</h1>
      <div className="mt-6"><InviteForm /></div>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-zinc-600"><tr><th className="px-4 py-3">Имя</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Пригласил</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>{users.map((user) => <tr className="border-t border-zinc-200" key={user.id}><td className="px-4 py-3">{user.name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3">{user.invitedBy?.name ?? "—"}</td><td className="px-4 py-3">{user.passwordHash ? "Активен" : "Ожидает пароль"}</td><td className="px-4 py-3 text-right">
            <ConfirmDeleteButton
              onConfirm={deactivateUser.bind(null, user.id)}
              confirmTitle="Удалить пользователя?"
              confirmMessage={`«${user.name}» (${user.email}) пропадёт из списка пользователей и не сможет войти в систему.`}
            />
          </td></tr>)}</tbody>
        </table>
      </div>
    </main>
  );
}
