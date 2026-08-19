import { SetPasswordForm } from "./SetPasswordForm";
import { getInvite } from "@/lib/auth/invites";

const errors = { invalid: "Ссылка недействительна.", expired: "Срок действия ссылки истёк.", used: "Эта ссылка уже была использована." };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Установка пароля</h1>
      {"error" in invite ? <p className="mt-3 text-sm text-red-700">{errors[invite.error]}</p> : <><p className="mt-2 text-sm text-zinc-600">Установите пароль для {invite.email}.</p><SetPasswordForm token={token} /></>}
    </div></main>
  );
}
