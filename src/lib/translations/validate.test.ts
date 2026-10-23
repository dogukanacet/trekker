import { describe, expect, it } from "vitest";
import { getPlaceholderNames, validateTranslation } from "./validate";

const names = (message: string) => {
  const result = getPlaceholderNames(message);
  return result === null ? null : [...result].sort();
};

describe("getPlaceholderNames", () => {
  it("finds simple, number, date and time arguments", () => {
    expect(names("Merhaba {name}")).toEqual(["name"]);
    expect(names("{n, number} adet, {d, date, short} {t, time}")).toEqual(["d", "n", "t"]);
  });

  it("finds arguments nested in plural and select branches", () => {
    expect(names("{count, plural, one {# öğe} other {# öğe, {user} ekledi}}")).toEqual([
      "count",
      "user",
    ]);
    expect(names("{g, select, male {{a}} female {{b}} other {{c}}}")).toEqual(["a", "b", "c", "g"]);
  });

  it("finds rich text tags and their contents", () => {
    expect(names("<b>Önemli</b> {name}")).toEqual(["<b>", "name"]);
    expect(names("<link>{label}</link>")).toEqual(["<link>", "label"]);
  });

  it("ignores literal text, apostrophes and quoted braces", () => {
    expect(names("Kullanıcı'nın hesabı")).toEqual([]);
    expect(names("'{'literal'}' {name}")).toEqual(["name"]);
  });

  it("returns null for invalid ICU syntax", () => {
    expect(names("{name")).toBeNull();
    expect(names("{count, plural, one {x}}")).toBeNull(); // plural without "other"
  });

  it("treats a stray closing brace as literal text, like the runtime does", () => {
    expect(names("Merhaba }")).toEqual([]);
  });
});

describe("validateTranslation", () => {
  it("accepts the same placeholders in any order", () => {
    expect(validateTranslation("{b} ve {a}", "{a} and {b}")).toBeNull();
  });

  it("reports missing and extra placeholders", () => {
    expect(validateTranslation("Merhaba", "Hello {name}")).toEqual({
      type: "placeholders",
      missing: ["name"],
      extra: [],
    });
    expect(validateTranslation("Merhaba {isim}", "Hello {name}")).toEqual({
      type: "placeholders",
      missing: ["name"],
      extra: ["isim"],
    });
  });

  it("detects a changed tag", () => {
    expect(validateTranslation("<i>x</i>", "<b>x</b>")).toEqual({
      type: "placeholders",
      missing: ["<b>"],
      extra: ["<i>"],
    });
  });

  it("reports syntax errors before comparing", () => {
    expect(validateTranslation("{name", "Hello {name}")).toEqual({ type: "syntax" });
  });

  it("only checks syntax without a reference, and skips a broken reference", () => {
    expect(validateTranslation("Hello {x}", null)).toBeNull();
    expect(validateTranslation("{x", null)).toEqual({ type: "syntax" });
    expect(validateTranslation("Hello {x}", "{broken")).toBeNull();
  });
});
