import { describe, expect, it } from "vitest";
import { hasTranslatableText, maskPlaceholders, unmaskPlaceholders } from "./mask";

describe("maskPlaceholders", () => {
  it("replaces arguments and tags with numbered tokens", () => {
    expect(maskPlaceholders("Merhaba {name}, <b>hoş geldin</b>")).toEqual({
      text: "Merhaba {0}, {1}hoş geldin{2}",
      tokens: ["{name}", "<b>", "</b>"],
    });
    expect(maskPlaceholders("{n, number} adet")).toEqual({
      text: "{0} adet",
      tokens: ["{n, number}"],
    });
  });

  it("returns null for plural, select and unbalanced braces", () => {
    expect(maskPlaceholders("{count, plural, one {# öğe} other {# öğe}}")).toBeNull();
    expect(maskPlaceholders("{g, select, a {x} other {y}}")).toBeNull();
    expect(maskPlaceholders("a { b")).toBeNull();
    expect(maskPlaceholders("a } b")).toBeNull();
  });

  it("keeps plain text untouched", () => {
    expect(maskPlaceholders("Kaydet")).toEqual({ text: "Kaydet", tokens: [] });
  });
});

describe("unmaskPlaceholders", () => {
  it("restores the original placeholders", () => {
    const masked = maskPlaceholders("Merhaba {name}, <b>hoş geldin</b>");
    expect(masked).not.toBeNull();
    expect(unmaskPlaceholders("Hello {0}, {1}welcome{2}", masked?.tokens ?? [])).toBe(
      "Hello {name}, <b>welcome</b>",
    );
  });

  it("tolerates spaces and keeps unknown numbers so validation can flag them", () => {
    expect(unmaskPlaceholders("{ 0 } ve {9}", ["{a}"])).toBe("{a} ve {9}");
  });

  it("doubles an apostrophe that would swallow the next placeholder", () => {
    expect(unmaskPlaceholders("l'{0}", ["{name}"])).toBe("l''{name}");
    expect(unmaskPlaceholders("l''{0}", ["{name}"])).toBe("l''{name}");
    expect(unmaskPlaceholders("l'{0}", ["<b>"])).toBe("l'<b>");
  });
});

describe("hasTranslatableText", () => {
  it("is false when only tokens or symbols remain", () => {
    expect(hasTranslatableText("{0}")).toBe(false);
    expect(hasTranslatableText("{0} / {1} - 12")).toBe(false);
    expect(hasTranslatableText("{0} adet")).toBe(true);
  });
});
