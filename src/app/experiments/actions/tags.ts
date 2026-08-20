import { prisma } from "@/lib/prisma";
import { resolveCustomTagId } from "@/lib/tags";

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function resolveTagIds(
  delegate: Parameters<typeof resolveCustomTagId>[0],
  idsCsv: string | undefined,
  namesCsv: string | undefined,
): Promise<string[]> {
  const ids = splitCsv(idsCsv);
  const newNames = splitCsv(namesCsv);
  const createdIds = await Promise.all(newNames.map((name) => resolveCustomTagId(delegate, name)));
  return [...ids, ...createdIds];
}

export async function resolveExperimentTagIds(data: {
  productIds?: string;
  productNew?: string;
  segmentIds?: string;
  segmentNew?: string;
}) {
  const [products, segments] = await Promise.all([
    resolveTagIds(prisma.product, data.productIds, data.productNew),
    resolveTagIds(prisma.segment, data.segmentIds, data.segmentNew),
  ]);
  return { products, segments };
}
