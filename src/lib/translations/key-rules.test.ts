import { describe, expect, it } from "vitest";
import { addCustomKeys } from "../../i18n/apply-overrides";
import { findKeyConflict, isPathFree, isValidKeyPath, isValidNamespace } from "./key-rules";

describe("key validation", () => {
  it("accepts normal names and rejects unsafe ones", () => {
    expect(isValidNamespace("Common")).toBe(true);
    expect(isValidNamespace("bad name")).toBe(false);
    expect(isValidNamespace("__proto__")).toBe(false);
    expect(isValidKeyPath("export.csv")).toBe(true);
    expect(isValidKeyPath("a.b.c.d")).toBe(true);
    expect(isValidKeyPath("a.b.c.d.e")).toBe(false);
    expect(isValidKeyPath("a..b")).toBe(false);
    expect(isValidKeyPath("a.constructor")).toBe(false);
    expect(isValidKeyPath("")).toBe(false);
  });
});

describe("findKeyConflict", () => {
  const ids = ["Common.save", "Common.export.csv"];

  it("detects an existing key", () => {
    expect(findKeyConflict("Common", "save", ids)).toBe("exists");
  });
  it("detects a new key below an existing leaf", () => {
    expect(findKeyConflict("Common", "save.short", ids)).toBe("insideExisting");
    expect(findKeyConflict("Common", "export.csv.x", ids)).toBe("insideExisting");
  });
  it("detects a new key that is already a parent", () => {
    expect(findKeyConflict("Common", "export", ids)).toBe("parentOfExisting");
  });
  it("allows unrelated and sibling keys", () => {
    expect(findKeyConflict("Common", "export.pdf", ids)).toBeNull();
    expect(findKeyConflict("Other", "save", ids)).toBeNull();
  });
});

describe("isPathFree", () => {
  const tree = { Common: { save: "Kaydet", list: ["a"], group: {} }, Top: "text" };

  it("is false when the path is occupied by any value", () => {
    expect(isPathFree(tree, ["Common", "save"])).toBe(false);
    expect(isPathFree(tree, ["Common", "list"])).toBe(false);
    expect(isPathFree(tree, ["Common", "group"])).toBe(false);
  });
  it("is false below a string or an array", () => {
    expect(isPathFree(tree, ["Top", "x"])).toBe(false);
    expect(isPathFree(tree, ["Common", "save", "x"])).toBe(false);
    expect(isPathFree(tree, ["Common", "list", "x"])).toBe(false);
  });
  it("is true for new paths", () => {
    expect(isPathFree(tree, ["Common", "new"])).toBe(true);
    expect(isPathFree(tree, ["Fresh", "a", "b"])).toBe(true);
  });
});

describe("addCustomKeys", () => {
  const base = { Common: { save: "Kaydet" } };

  it("creates nested paths without mutating the input", () => {
    const result = addCustomKeys(base, [
      { namespace: "Common", key: "export.csv", value: "CSV" },
      { namespace: "Fresh", key: "hello", value: "Merhaba" },
    ]);
    expect(result).toEqual({
      Common: { save: "Kaydet", export: { csv: "CSV" } },
      Fresh: { hello: "Merhaba" },
    });
    expect(base).toEqual({ Common: { save: "Kaydet" } });
  });

  it("never overwrites existing values or walks through a string", () => {
    const result = addCustomKeys(base, [
      { namespace: "Common", key: "save", value: "X" },
      { namespace: "Common", key: "save.short", value: "Y" },
    ]);
    expect(result).toEqual(base);
  });

  it("ignores prototype-polluting segments", () => {
    const result = addCustomKeys(base, [
      { namespace: "Common", key: "__proto__.polluted", value: "x" },
      { namespace: "constructor", key: "prototype.polluted", value: "x" },
    ]);
    expect(result).toEqual(base);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
