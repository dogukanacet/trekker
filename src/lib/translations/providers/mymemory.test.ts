import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./mymemory";

describe("decodeHtmlEntities", () => {
  it("decodes the entities MyMemory may return", () => {
    expect(decodeHtmlEntities("it&#39;s &quot;ok&quot; &amp; &lt;b&gt; &#x41;")).toBe(
      `it's "ok" & <b> A`,
    );
  });

  it("does not decode twice", () => {
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
  });

  it("drops invalid code points instead of throwing", () => {
    expect(decodeHtmlEntities("a&#99999999;b")).toBe("ab");
  });
});
