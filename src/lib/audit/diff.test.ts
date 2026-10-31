import { describe, expect, it } from "vitest";
import { diffRecords } from "./diff";

describe("diffRecords", () => {
  it("returns only the changed fields", () => {
    expect(
      diffRecords({ plate: "34 A 1", model: "Ford" }, { plate: "34 A 1", model: "Fiat" }),
    ).toEqual({
      model: { from: "Ford", to: "Fiat" },
    });
  });

  it("returns null when nothing changed", () => {
    expect(diffRecords({ plate: "34 A 1" }, { plate: "34 A 1" })).toBeNull();
  });

  it("treats equal dates as unchanged and serializes changed ones as ISO strings", () => {
    const a = new Date("2026-01-01T00:00:00.000Z");
    expect(diffRecords({ d: a }, { d: new Date(a) })).toBeNull();
    expect(diffRecords({ d: a }, { d: new Date("2026-02-01T00:00:00.000Z") })).toEqual({
      d: { from: "2026-01-01T00:00:00.000Z", to: "2026-02-01T00:00:00.000Z" },
    });
  });

  it("treats undefined and null as the same empty value", () => {
    expect(diffRecords({ model: null }, { model: undefined })).toBeNull();
  });

  it("builds a create entry from an empty before", () => {
    expect(diffRecords({}, { plate: "34 A 1" })).toEqual({ plate: { from: null, to: "34 A 1" } });
  });

  it("builds a delete entry from an empty after", () => {
    expect(diffRecords({ plate: "34 A 1" }, {})).toEqual({ plate: { from: "34 A 1", to: null } });
  });

  it("never includes sensitive keys", () => {
    expect(
      diffRecords({ passwordHash: "a", email: "x" }, { passwordHash: "b", email: "y" }),
    ).toEqual({
      email: { from: "x", to: "y" },
    });
  });
});
