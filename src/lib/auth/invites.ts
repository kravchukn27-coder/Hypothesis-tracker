import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TOKEN_BYTES = 32;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

type InviteTokenFailure = "invalid" | "expired" | "used";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function createRawToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function issueInvite(issuerUserId: string, name: string, email: string): Promise<string> {
  const normalizedName = name.trim();
  const normalizedEmail = normalizeInviteEmail(email);
  if (!normalizedName || !normalizedEmail) throw new Error("Введите имя и email.");
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Введите корректный email.");

  const rawToken = createRawToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, passwordHash: true },
    });
    if (existingUser?.passwordHash) {
      throw new Error("Пользователь с этим email уже активирован.");
    }

    const invitedUser =
      existingUser ??
      (await tx.user.create({
        data: { name: normalizedName, email: normalizedEmail, invitedById: issuerUserId },
        select: { id: true },
      }));

    await tx.passwordSetupToken.updateMany({
      where: { userId: invitedUser.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.passwordSetupToken.create({
      data: {
        userId: invitedUser.id,
        issuedByUserId: issuerUserId,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });
    await tx.auditLog.create({
      data: { event: "INVITE_ISSUED", userId: issuerUserId, metadata: { invitedUserId: invitedUser.id, email: normalizedEmail } },
    });
  });

  return rawToken;
}

export async function getInvite(rawToken: string): Promise<{ email: string } | { error: InviteTokenFailure }> {
  const token = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { email: true, isActive: true } } },
  });
  if (!token || token.invalidatedAt) return { error: "invalid" };
  if (token.usedAt) return { error: "used" };
  if (token.expiresAt <= new Date() || !token.user?.isActive) return { error: "expired" };

  return { email: token.user.email };
}

export async function consumeInvite(rawToken: string, passwordHash: string): Promise<{ ok: true } | { error: InviteTokenFailure }> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordSetupToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { id: true, isActive: true } } },
    });
    if (!token || token.invalidatedAt) return { error: "invalid" as const };
    if (token.usedAt) return { error: "used" as const };
    if (token.expiresAt <= now || !token.user?.isActive) return { error: "expired" as const };

    await tx.user.update({
      where: { id: token.user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordSetupToken.updateMany({
      where: { userId: token.user.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.passwordSetupToken.update({
      where: { id: token.id },
      data: { usedAt: now, invalidatedAt: null },
    });
    await tx.auditLog.create({ data: { event: "PASSWORD_SET", userId: token.user.id } });

    return { ok: true as const };
  });
}
