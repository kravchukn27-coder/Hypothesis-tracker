import { prisma } from "./prisma";

/** Resolves a submitted Funnel Level name to its id, upserting new names. */
export async function resolveFunnelLevelId(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const level = await prisma.funnelLevel.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed, isCustom: true },
  });
  return level.id;
}
