import { afterEach, describe, expect, it, vi } from "vitest";
import { planProviders } from "./providers";
import type { ProviderId } from "./providers/meta";
import { ProviderError, type TranslationProvider } from "./providers/types";
import { dedupeSwitches, translateTextsWithFallback } from "./translate-with-fallback";

function fakeProvider(
  name: ProviderId,
  translateMany: (texts: string[]) => Promise<string[]>,
): TranslationProvider {
  return {
    name,
    maxBytes: 1000,
    translate: async (text) => (await translateMany([text]))[0] ?? "",
    translateMany,
  };
}

const working = (name: ProviderId) =>
  fakeProvider(name, async (texts) => texts.map((text) => `${text} (${name})`));
const outOfQuota = (name: ProviderId) =>
  fakeProvider(name, async () => {
    throw new ProviderError("quota", "limit reached");
  });

describe("translateTextsWithFallback", () => {
  it("does not switch when the primary service works", async () => {
    const report = await translateTextsWithFallback(
      { primary: working("gemini"), fallbacks: [working("cloudflare")] },
      ["Kaydet"],
      "tr",
      "en",
    );
    expect(report.used).toBe("gemini");
    expect(report.switched).toEqual([]);
    expect(report.outcomes).toEqual([{ ok: true, text: "Kaydet (gemini)" }]);
  });

  it("retries on the next service when the primary one is out of quota", async () => {
    const report = await translateTextsWithFallback(
      { primary: outOfQuota("gemini"), fallbacks: [working("cloudflare")] },
      ["Kaydet", "İptal"],
      "tr",
      "en",
    );
    expect(report.used).toBe("cloudflare");
    expect(report.switched).toEqual([{ from: "gemini", to: "cloudflare" }]);
    expect(report.outcomes.every((outcome) => outcome.ok)).toBe(true);
  });

  it("walks the whole chain and reports the last failure when every service fails", async () => {
    const report = await translateTextsWithFallback(
      {
        primary: outOfQuota("gemini"),
        fallbacks: [outOfQuota("cloudflare"), outOfQuota("mymemory")],
      },
      ["Kaydet"],
      "tr",
      "en",
    );
    expect(report.used).toBe("mymemory");
    expect(report.switched).toEqual([
      { from: "gemini", to: "cloudflare" },
      { from: "cloudflare", to: "mymemory" },
    ]);
    expect(report.outcomes).toEqual([{ ok: false, reason: "quota" }]);
  });

  it("never retries texts that failed for their own reasons", async () => {
    const report = await translateTextsWithFallback(
      { primary: outOfQuota("gemini"), fallbacks: [working("cloudflare")] },
      ["{count, plural, one {a} other {b}}", "Kaydet"],
      "tr",
      "en",
    );
    expect(report.outcomes[0]).toEqual({ ok: false, reason: "unsupported" });
    expect(report.outcomes[1]).toEqual({ ok: true, text: "Kaydet (cloudflare)" });
  });

  it("does not switch without fallbacks", async () => {
    const report = await translateTextsWithFallback(
      { primary: outOfQuota("gemini"), fallbacks: [] },
      ["Kaydet"],
      "tr",
      "en",
    );
    expect(report.switched).toEqual([]);
    expect(report.outcomes).toEqual([{ ok: false, reason: "quota" }]);
  });
});

describe("dedupeSwitches", () => {
  it("keeps each switch once", () => {
    const change = { from: "gemini", to: "cloudflare" } as const;
    expect(dedupeSwitches([change, { ...change }])).toEqual([change]);
  });
});

describe("planProviders", () => {
  afterEach(() => vi.unstubAllEnvs());

  // Empty values count as "not configured"
  const configure = (env: Record<string, string>) => {
    for (const name of [
      "GEMINI_API_KEY",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "TRANSLATION_PROVIDER",
    ]) {
      vi.stubEnv(name, env[name] ?? "");
    }
  };

  it("uses MyMemory when nothing else is configured", () => {
    configure({});
    const plan = planProviders(null, true);
    expect(plan.primary.name).toBe("mymemory");
    expect(plan.fallbacks).toEqual([]);
  });

  it("prefers the configured services in order and lists the rest as fallbacks", () => {
    configure({
      GEMINI_API_KEY: "key",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_API_TOKEN: "token",
    });
    const plan = planProviders(null, true);
    expect(plan.primary.name).toBe("gemini");
    expect(plan.fallbacks.map((provider) => provider.name)).toEqual(["cloudflare", "mymemory"]);
    expect(planProviders(null, false).fallbacks).toEqual([]);
  });

  it("honours a valid choice and ignores a stale one", () => {
    configure({ GEMINI_API_KEY: "key" });
    expect(planProviders("mymemory", true).primary.name).toBe("mymemory");
    // Cloudflare is not configured, so the server default is used instead
    expect(planProviders("cloudflare", true).primary.name).toBe("gemini");
    expect(planProviders("nonsense", true).primary.name).toBe("gemini");
  });

  it("lets TRANSLATION_PROVIDER pick the default when it is usable", () => {
    configure({ GEMINI_API_KEY: "key", TRANSLATION_PROVIDER: "mymemory" });
    expect(planProviders(null, false).primary.name).toBe("mymemory");

    configure({ TRANSLATION_PROVIDER: "cloudflare" });
    expect(planProviders(null, false).primary.name).toBe("mymemory");
  });
});
