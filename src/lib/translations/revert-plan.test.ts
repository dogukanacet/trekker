import { describe, expect, it } from "vitest";
import { planRevert, type CurrentRow, type ReleaseItemLike } from "./revert-plan";

const item = (
  key: string,
  previousValue: string | null,
  newValue: string | null,
): ReleaseItemLike => ({ locale: "tr", namespace: "Common", key, previousValue, newValue });

const row = (
  key: string,
  publishedValue: string | null,
  draftValue: string | null = null,
): CurrentRow => ({ locale: "tr", namespace: "Common", key, publishedValue, draftValue });

describe("planRevert", () => {
  it("restores the previous value when the text is still what the release wrote", () => {
    const plan = planRevert([item("save", "Eski", "Yeni")], [row("save", "Yeni")]);
    expect(plan.skipped).toBe(0);
    expect(plan.operations).toEqual([
      { type: "update", item: item("save", "Eski", "Yeni"), current: "Yeni", target: "Eski" },
    ]);
  });

  it("skips texts that were changed after the release", () => {
    const plan = planRevert([item("save", "Eski", "Yeni")], [row("save", "Daha yeni")]);
    expect(plan.operations).toEqual([]);
    expect(plan.skipped).toBe(1);
  });

  it("deletes the row when nothing is left to keep, keeps it when a draft exists", () => {
    const first = planRevert([item("save", null, "Yeni")], [row("save", "Yeni")]);
    expect(first.operations[0]?.type).toBe("delete");

    const second = planRevert([item("save", null, "Yeni")], [row("save", "Yeni", "Taslak")]);
    expect(second.operations[0]).toMatchObject({ type: "update", target: null });
  });

  it("re-creates a removed override when a revert is undone", () => {
    // The revert removed the override: previous "Yeni", new null, and the row is gone
    const plan = planRevert([item("save", "Yeni", null)], []);
    expect(plan.operations).toEqual([
      { type: "create", item: item("save", "Yeni", null), current: null, target: "Yeni" },
    ]);
  });

  it("does nothing when the text is already in the wanted state", () => {
    expect(planRevert([item("save", "Ayni", "Ayni")], [row("save", "Ayni")])).toEqual({
      operations: [],
      skipped: 0,
    });
  });

  it("matches rows per locale", () => {
    const plan = planRevert(
      [{ ...item("save", "Eski", "Yeni"), locale: "en" }],
      [row("save", "Yeni")], // same key, but only the tr row exists
    );
    expect(plan.skipped).toBe(1);
  });
});
