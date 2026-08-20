import { prisma } from "./prisma";
import { resolveCustomTagId } from "./tags";

export async function getFunnelLevels() {
  return prisma.funnelLevel.findMany({ orderBy: { name: "asc" } });
}

/** Resolves a submitted Funnel Level name to its id, upserting new names. */
export async function resolveFunnelLevelId(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return resolveCustomTagId(prisma.funnelLevel, trimmed);
}
