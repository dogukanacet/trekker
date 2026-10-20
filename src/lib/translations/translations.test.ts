import { describe, expect, it } from "vitest";
import { flattenMessages } from "./flatten";
import { applyOverrides } from "../../i18n/apply-overrides";

const base = {
  Common: { save: "Kaydet", export: { csv: "CSV" } },
  Orphan: "top-level string",
};

describe("flattenMessages", () => {
  it("flattens nested keys with namespace and dot path", () => {
    expect(flattenMessages(base)).toEqual([
      { namespace: "Common", key: "save", value: "Kaydet" },
      { namespace: "Common", key: "export.csv", value: "CSV" },
    ]);
  });
});

describe("applyOverrides", () => {
  it("replaces existing string keys", () => {
    const result = applyOverrides(base, [
      { namespace: "Common", key: "export.csv", publishedValue: "Dışa aktar" },
    ]);
    expect(result).toMatchObject({ Common: { export: { csv: "Dışa aktar" } } });
  });

  it("ignores unknown keys and prototype paths", () => {
    const result = applyOverrides(base, [
      { namespace: "Common", key: "nope.deep", publishedValue: "x" },
      { namespace: "Common", key: "__proto__.polluted", publishedValue: "x" },
    ]);
    expect(result).toEqual(base);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not mutate the base object", () => {
    applyOverrides(base, [{ namespace: "Common", key: "save", publishedValue: "Değişti" }]);
    expect(base.Common.save).toBe("Kaydet");
  });

  it("skips null published values", () => {
    const result = applyOverrides(base, [
      { namespace: "Common", key: "save", publishedValue: null },
    ]);
    expect(result).toEqual(base);
  });
});
