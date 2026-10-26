import { prisma } from "@/lib/prisma";

export type ReleaseSummary = {
  id: string;
  kind: "PUBLISH" | "REVERT";
  createdAt: string; // ISO string, safe to pass to client components
  user: string | null;
  itemCount: number;
};

export type ReleaseItemView = {
  id: string;
  locale: string;
  path: string; // "namespace.key"
  previousValue: string | null;
  newValue: string | null;
};

export async function getRecentReleases(limit = 30): Promise<ReleaseSummary[]> {
  const rows = await prisma.translationRelease.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      createdAt: true,
      createdBy: { select: { email: true } },
      _count: { select: { items: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    user: row.createdBy?.email ?? null,
    itemCount: row._count.items,
  }));
}
