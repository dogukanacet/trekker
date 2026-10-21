import { describe, expect, it } from "vitest";
import type { TranslationRow } from "./catalog";
import { getLanguageStats } from "./language-stats";

describe("getLanguageStats", () => {
  const cell = (base: string | null, draft: string | null = null) => ({
    base,
    published: null,
    draft,
  });
  const row = (id: string, tr: string | null, de: string | null, deDraft?: string) =>
    ({
      id,
      namespace: "N",
      key: id,
      hasDraft: deDraft !== undefined,
      isCustom: false,
      cells: { tr: cell(tr), de: cell(de, deDraft ?? null) },
    }) as TranslationRow;

  it("counts non-empty texts per language, drafts included", () => {
    const rows = [row("a", "x", "y"), row("b", "x", null), row("c", "x", null, "draft")];
    const stats = getLanguageStats(rows, ["tr", "de"], ["tr"], "tr");

    expect(stats).toEqual([
      { code: "tr", enabled: true, isDefault: true, translated: 3, total: 3 },
      { code: "de", enabled: false, isDefault: false, translated: 2, total: 3 },
    ]);
  });
});
