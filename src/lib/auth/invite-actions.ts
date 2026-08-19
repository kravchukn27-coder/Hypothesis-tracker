"use server";

import { getCurrentUser } from "./session";
import { hashPassword } from "./password";
import { consumeInvite, issueInvite } from "./invites";

export type InviteActionState = { error?: string; link?: string };
export type SetPasswordActionState = { error?: string; success?: boolean };

export async function createInvite(_previousState: InviteActionState, formData: FormData): Promise<InviteActionState> {
  const issuer = await getCurrentUser();
  if (!issuer) return { error: "Сессия истекла. Войдите снова." };

  try {
    const token = await issueInvite(issuer.id, String(formData.get("name") ?? ""), String(formData.get("email") ?? ""));
    return { link: `/invite/${token}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось создать приглашение." };
  }
}

export async function setPasswordFromInvite(
  _previousState: SetPasswordActionState,
  formData: FormData,
): Promise<SetPasswordActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (password.length < 8) return { error: "Пароль должен содержать не менее 8 символов." };
  if (password !== passwordConfirm) return { error: "Пароли не совпадают." };

  const result = await consumeInvite(token, hashPassword(password));
  if ("error" in result) {
    return {
      error:
        result.error === "used"
          ? "Эта ссылка уже была использована."
          : result.error === "expired"
            ? "Срок действия ссылки истёк."
            : "Ссылка недействительна.",
    };
  }

  return { success: true };
}
