export type ReleaseItemLike = {
  locale: string;
  namespace: string;
  key: string;
  previousValue: string | null;
  newValue: string | null;
};

export type CurrentRow = {
  locale: string;
  namespace: string;
  key: string;
  publishedValue: string | null;
  draftValue: string | null;
};

export type RevertOperation =
  | { type: "update"; item: ReleaseItemLike; current: string | null; target: string | null }
  | { type: "delete"; item: ReleaseItemLike; current: string | null; target: null }
  | { type: "create"; item: ReleaseItemLike; current: null; target: string };

export type RevertPlan = {
  operations: RevertOperation[];
  // Items that changed after the release, so they are left alone
  skipped: number;
};

const rowId = (row: { locale: string; namespace: string; key: string }) =>
  `${row.locale}\u0000${row.namespace}\u0000${row.key}`;

export function planRevert(items: ReleaseItemLike[], rows: CurrentRow[]): RevertPlan {
  const byId = new Map(rows.map((row) => [rowId(row), row]));
  const operations: RevertOperation[] = [];
  let skipped = 0;

  for (const item of items) {
    const row = byId.get(rowId(item));
    const current = row?.publishedValue ?? null;

    // Only undo what this release wrote; a later change must not be overwritten
    if (current !== item.newValue) {
      skipped++;
      continue;
    }

    const target = item.previousValue;
    if (current === target) continue; // already in the wanted state

    if (!row) {
      // Re-creating a removed override (undoing a revert)
      if (target === null) continue;
      operations.push({ type: "create", item, current: null, target });
    } else if (target === null && row.draftValue === null) {
      // No published text and no draft left: the row carries no information
      operations.push({ type: "delete", item, current, target: null });
    } else {
      operations.push({ type: "update", item, current, target });
    }
  }

  return { operations, skipped };
}
