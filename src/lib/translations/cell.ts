import type { TranslationCell, TranslationRow } from "./catalog";

// What the app currently shows for this cell once the draft is considered
export function effectiveValue(cell: TranslationCell): string {
  return cell.draft ?? cell.published ?? cell.base ?? "";
}

export type RowStatus = "default" | "published" | "draft";

export function getRowStatus(row: TranslationRow): RowStatus {
  if (row.hasDraft) return "draft";
  const hasPublished = Object.values(row.cells).some((cell) => cell.published !== null);
  return hasPublished ? "published" : "default";
}
