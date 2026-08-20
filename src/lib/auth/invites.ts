import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

type TransactionClient = Prisma.TransactionClient;

const INVITE_TOKEN_BYTES = 32;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

type InviteTokenFailure = "invalid" | "expired" | "used";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function createRawToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

async function issuePasswordSetupToken(tx: TransactionClient, userId: string, issuerUserId: string, now: Date): Promise<string> {
  const rawToken = createRawToken();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  await tx.passwordSetupToken.updateMany({
    where: { userId, usedAt: null, invalidatedAt: null },
    data: { invalidatedAt: now },
  });
  await tx.passwordSetupToken.create({
    data: { userId, issuedByUserId: issuerUserId, tokenHash: hashToken(rawToken), expiresAt },
  });
  return rawToken;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function issueInvite(issuerUserId: string, email: string): Promise<string> {
  const normalizedEmail = normalizeInviteEmail(email);
  if (!normalizedEmail) throw new Error("Введите email.");
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Введите корректный email.");

  const now = new Date();
  let rawToken = "";

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
      // Placeholder until the invitee sets their own name in consumeInvite —
      // User.name is required and can't be left blank at this stage.
      (await tx.user.create({
        data: { name: normalizedEmail, email: normalizedEmail, invitedById: issuerUserId },
        select: { id: true },
      }));

    rawToken = await issuePasswordSetupToken(tx, invitedUser.id, issuerUserId, now);
    await writeAuditLog({ event: "INVITE_ISSUED", userId: issuerUserId, metadata: { invitedUserId: invitedUser.id, email: normalizedEmail } }, tx);
  });

  return rawToken;
}

export async function issuePasswordReset(issuerUserId: string, userId: string): Promise<string> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true, email: true } });
    if (!target) throw new Error("Пользователь не найден.");

    const rawToken = await issuePasswordSetupToken(tx, target.id, issuerUserId, now);
    await writeAuditLog({ event: "PASSWORD_RESET_ISSUED", userId: issuerUserId, metadata: { targetUserId: target.id, targetUserEmail: target.email } }, tx);

    return rawToken;
  });
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

export async function consumeInvite(rawToken: string, name: string, passwordHash: string): Promise<{ ok: true } | { error: InviteTokenFailure }> {
  const now = new Date();
  const normalizedName = name.trim();

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
      data: { name: normalizedName, passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordSetupToken.updateMany({
      where: { userId: token.user.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
    await tx.passwordSetupToken.update({
      where: { id: token.id },
      data: { usedAt: now, invalidatedAt: null },
    });
    await writeAuditLog({ event: "PASSWORD_SET", userId: token.user.id }, tx);

    return { ok: true as const };
  });
}
