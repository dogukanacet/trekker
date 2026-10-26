import { describe, expect, it } from "vitest";
import type { TranslationRow } from "./catalog";
import { analyzeImport, buildExport } from "./transfer";

function makeRow(id: string, tr: string, en: string, trDraft?: string): TranslationRow {
  const [namespace = "", ...rest] = id.split(".");
  return {
    id,
    namespace,
    key: rest.join("."),
    hasDraft: trDraft !== undefined,
    isCustom: false,
    cells: {
      tr: { base: tr, published: null, draft: trDraft ?? null },
      en: { base: en, published: null, draft: null },
      de: { base: null, published: null, draft: null },
    },
  };
}

const rows = [
  makeRow("Common.greeting", "Merhaba {name}", "Hello {name}"),
  makeRow("Common.save", "Kaydet", "Save", "Kaydı yap"),
];
const reference = (namespace: string, key: string) =>
  rows.find((row) => row.id === `${namespace}.${key}`)?.cells.tr?.base ?? null;
const locales = ["tr", "en", "de"];

const defaults = {
  createKeys: false,
  defaultLocale: "tr",
  isPathAvailable: (_namespace: string, _key: string) => true,
};
const run = (data: unknown, overrides: Partial<typeof defaults> = {}) =>
  analyzeImport(data, rows, reference, locales, 100, { ...defaults, ...overrides });

describe("buildExport", () => {
  it("exports what the table shows and leaves empty texts out", () => {
    expect(buildExport(rows, ["tr", "de"])).toEqual({
      tr: { "Common.greeting": "Merhaba {name}", "Common.save": "Kaydı yap" },
      de: {},
    });
  });
});

describe("analyzeImport", () => {
  it("accepts valid changed texts and counts unchanged ones", () => {
    const result = run({
      de: { "Common.greeting": "Hallo {name}", "Common.save": "Speichern" },
      en: { "Common.save": "Save" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.entries).toEqual([
      { locale: "de", namespace: "Common", key: "greeting", value: "Hallo {name}" },
      { locale: "de", namespace: "Common", key: "save", value: "Speichern" },
    ]);
    expect(result.analysis.unchanged).toBe(1);
  });

  it("reports unknown languages and skips unknown keys when creating is off", () => {
    const result = run({
      xx: { "Common.save": "x" },
      tr: { "Common.nope": "x" },
      en: { "Common.nope": "x" },
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.unknownLocales).toEqual(["xx"]);
    // One key carried by two languages counts once
    expect(result.analysis.unknownKeyCount).toBe(1);
    expect(result.analysis.unknownKeyExamples).toEqual(["Common.nope"]);
    expect(result.analysis.entries).toEqual([]);
  });

  it("flags broken placeholders and bad values without importing them", () => {
    const result = run({
      de: {
        "Common.greeting": "Hallo {isim}",
        "Common.save": 42,
      },
      en: { "Common.save": "   " },
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.entries).toEqual([]);
    expect(result.analysis.problems.map((problem) => problem.kind)).toEqual([
      "invalid",
      "notText",
      "empty",
    ]);
  });

  it("rejects wrong shapes and oversized files", () => {
    expect(run([])).toEqual({ ok: false, error: "format" });
    expect(run({ de: "text" })).toEqual({ ok: false, error: "format" });
    expect(
      analyzeImport({ de: { a: "1", b: "2" } }, rows, reference, locales, 1, defaults),
    ).toEqual({ ok: false, error: "tooManyEntries" });
  });
});

describe("analyzeImport with new keys", () => {
  const create = { createKeys: true };

  it("creates keys that are not in the catalog", () => {
    const result = run(
      {
        tr: { "Common.fresh": "Yeni {name}" },
        en: { "Common.fresh": "New {name}" },
        de: { "Common.fresh": "Neu {name}" },
      },
      create,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.newKeys).toEqual(["Common.fresh"]);
    expect(result.analysis.entries).toHaveLength(3);
    expect(result.analysis.unknownKeyCount).toBe(0);
    expect(result.analysis.problems).toEqual([]);
  });

  it("requires the default language text", () => {
    const result = run({ en: { "Common.fresh": "New" } }, create);
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.newKeys).toEqual([]);
    expect(result.analysis.entries).toEqual([]);
    expect(result.analysis.problems.map((problem) => problem.kind)).toEqual(["defaultMissing"]);
  });

  it("checks other languages against the default text but still creates the key", () => {
    const result = run(
      { tr: { "Common.fresh": "Merhaba {name}" }, en: { "Common.fresh": "Hello" } },
      create,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.newKeys).toEqual(["Common.fresh"]);
    expect(result.analysis.entries.map((entry) => entry.locale)).toEqual(["tr"]);
    expect(result.analysis.problems.map((problem) => problem.kind)).toEqual(["invalid"]);
  });

  it("rejects bad names and conflicts without blocking other keys", () => {
    const result = run(
      {
        tr: {
          nodot: "x",
          "Common.bad key": "x",
          "Common.save.short": "x",
          "Common.x": "x",
          "Common.x.y": "x",
          "Common.good": "x",
        },
      },
      create,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.newKeys).toEqual(["Common.good", "Common.x"]);
    expect(result.analysis.problems.map((problem) => [problem.id, problem.kind])).toEqual([
      ["Common.bad key", "badKey"],
      ["Common.save.short", "keyConflict"],
      ["Common.x.y", "keyConflict"],
      ["nodot", "badKey"],
    ]);
  });

  it("refuses a path that a locale file already uses", () => {
    const result = run(
      { tr: { "Common.fresh": "x" } },
      { ...create, isPathAvailable: () => false },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.analysis.newKeys).toEqual([]);
    expect(result.analysis.problems.map((problem) => problem.kind)).toEqual(["keyConflict"]);
  });
});
