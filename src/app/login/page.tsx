import { loginAsUser } from "@/lib/auth/actions";

const errors: Record<string, string> = {
  credentials: "Неверный email или пароль.",
  ratelimit: "Слишком много попыток входа. Подождите 15 минут и попробуйте снова.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error, from } = await searchParams;
  const message = typeof error === "string" ? errors[error] : undefined;
  const returnPath =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.includes("\\")
      ? from
      : "/";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Вход</h1>
        <p className="mt-1 text-sm text-zinc-600">Введите email и пароль учётной записи.</p>
        {message ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p> : null}
        <form action={loginAsUser} className="mt-6 space-y-4">
          <input type="hidden" name="from" value={returnPath} />
          <label className="block text-sm font-medium">
            Email
            <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" name="email" type="email" autoComplete="username" required />
          </label>
          <label className="block text-sm font-medium">
            Пароль
            <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800" type="submit">
            Войти
          </button>
        </form>
      </div>
    </main>
  );
}
