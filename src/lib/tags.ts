// Badge colors for Experiment's remaining tag categories, matching the
// source tool's color scheme. Platform/Channel/Market were removed
// (PROD-035) — unused in practice.
export const FUNNEL_LEVEL_BADGE_COLOR = "bg-amber-50 text-amber-700 ring-amber-600/20";
export const PRODUCT_BADGE_COLOR = "bg-purple-50 text-purple-700 ring-purple-600/20";
export const SEGMENT_BADGE_COLOR = "bg-rose-50 text-rose-700 ring-rose-600/20";

type TagDelegate = {
  upsert: (args: {
    where: { name: string };
    update: object;
    create: { name: string; isCustom: boolean };
  }) => Promise<{ id: string }>;
};

export async function resolveCustomTagId(delegate: TagDelegate, name: string) {
  const tag = await delegate.upsert({
    where: { name },
    update: {},
    create: { name, isCustom: true },
  });
  return tag.id;
}
