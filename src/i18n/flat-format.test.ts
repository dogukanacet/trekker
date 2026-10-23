import { describe, expect, it } from "vitest";
import { flattenMessages } from "../lib/translations/flatten";
import { unflattenMessages } from "./flat-format";

describe("unflattenMessages", () => {
  it("builds nested messages from dotted keys", () => {
    const { tree, skipped } = unflattenMessages({
      "Common.add": "Ekle",
      "Common.export.csv": "CSV",
      "Drivers.title": "Sürücüler",
    });
    expect(tree).toEqual({
      Common: { add: "Ekle", export: { csv: "CSV" } },
      Drivers: { title: "Sürücüler" },
    });
    expect(skipped).toEqual([]);
  });

  it("skips a key below an existing text, whatever the order", () => {
    expect(unflattenMessages({ "A.b": "x", "A.b.c": "y" })).toEqual({
      tree: { A: { b: "x" } },
      skipped: ["A.b.c"],
    });
    expect(unflattenMessages({ "A.b.c": "y", "A.b": "x" })).toEqual({
      tree: { A: { b: { c: "y" } } },
      skipped: ["A.b"],
    });
  });

  it("skips empty and prototype-polluting segments", () => {
    const { tree, skipped } = unflattenMessages({
      "A..b": "x",
      "__proto__.polluted": "x",
      "A.constructor": "x",
      "A.ok": "fine",
    });
    expect(tree).toEqual({ A: { ok: "fine" } });
    expect(skipped).toEqual(["A..b", "__proto__.polluted", "A.constructor"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("round-trips with flattenMessages", () => {
    const flat = { "Common.add": "Ekle", "Common.export.csv": "CSV" };
    const entries = flattenMessages(unflattenMessages(flat).tree).map(
      (entry) => `${entry.namespace}.${entry.key}`,
    );
    expect(entries.sort()).toEqual(Object.keys(flat).sort());
  });
});
