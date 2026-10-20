import { describe, expect, it } from "vitest";
import type { TranslationRow } from "./catalog";
import { fold, queryTranslationRows } from "./query";

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
    },
  };
}

const rows = [
  makeRow("Common.save", "Kaydet", "Save"),
  makeRow("Common.cancel", "İptal", "Cancel"),
  makeRow("Drivers.title", "Sürücüler", "Drivers", "Şoförler"),
];
const page = { skip: 0, take: 50 };
const ids = (result: ReturnType<typeof queryTranslationRows>) => result.rows.map((r) => r.id);

describe("fold", () => {
  it("removes accents and handles Turkish dotted/dotless i", () => {
    expect(fold("İptal ŞÖĞÜÇ ı")).toBe("iptal soguc i");
  });
});

describe("queryTranslationRows", () => {
  it("searches keys and every locale, ignoring accents", () => {
    expect(ids(queryTranslationRows(rows, { search: "iptal" }, page))).toEqual(["Common.cancel"]);
    expect(ids(queryTranslationRows(rows, { search: "CANCEL" }, page))).toEqual(["Common.cancel"]);
    expect(ids(queryTranslationRows(rows, { search: "drivers.ti" }, page))).toEqual([
      "Drivers.title",
    ]);
  });

  it("searches what the table shows: a draft wins over the default text", () => {
    expect(ids(queryTranslationRows(rows, { search: "soforler" }, page))).toEqual([
      "Drivers.title",
    ]);
    expect(queryTranslationRows(rows, { search: "suruculer" }, page).totalCount).toBe(0);
  });

  it("filters by status", () => {
    expect(ids(queryTranslationRows(rows, { status: "draft" }, page))).toEqual(["Drivers.title"]);
    expect(queryTranslationRows(rows, { status: "published" }, page).totalCount).toBe(0);
  });

  it("sorts by status", () => {
    const result = queryTranslationRows(rows, { sortBy: "status", sortOrder: "desc" }, page);
    expect(result.rows[0]?.id).toBe("Drivers.title");
  });

  it("pages after filtering and reports the full count", () => {
    const result = queryTranslationRows(rows, {}, { skip: 1, take: 1 });
    expect(result.totalCount).toBe(3);
    expect(result.rows).toHaveLength(1);
  });

  it("sorts by a locale column with that language's collation", () => {
    const trRows = [
      makeRow("A.one", "Zeytin", "x"),
      makeRow("A.two", "Çay", "x"),
      makeRow("A.three", "Ayran", "x"),
    ];
    const asc = queryTranslationRows(trRows, { sortBy: "locale-tr", sortOrder: "asc" }, page);
    // Turkish collation puts "Ç" right after "C", so "Çay" comes before "Zeytin"
    expect(ids(asc)).toEqual(["A.three", "A.two", "A.one"]);

    const desc = queryTranslationRows(trRows, { sortBy: "locale-tr", sortOrder: "desc" }, page);
    expect(ids(desc)).toEqual(["A.one", "A.two", "A.three"]);
  });

  it("sorts by what the table shows (draft over default)", () => {
    const result = queryTranslationRows(rows, { sortBy: "locale-tr", sortOrder: "asc" }, page);
    // Turkish collation sorts "İptal" before "Kaydet", then the draft "Şoförler".
    expect(ids(result)).toEqual(["Common.cancel", "Common.save", "Drivers.title"]);
  });

  it("ignores unknown sort keys and keeps paging stable on ties", () => {
    expect(ids(queryTranslationRows(rows, { sortBy: "locale-xx" }, page))).toEqual(
      ids(queryTranslationRows(rows, {}, page)),
    );
    const sameStatus = queryTranslationRows(rows, { sortBy: "status", sortOrder: "asc" }, page);
    // Two non-draft rows tie on status, so they stay ordered by id
    expect(ids(sameStatus).slice(0, 2)).toEqual(["Common.cancel", "Common.save"]);
  });
});
