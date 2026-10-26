import { ProviderError, type TranslationProvider } from "./types";

const ENDPOINT = "https://api.mymemory.translated.net/get";
const TIMEOUT_MS = 15_000;

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
  responseDetails?: string;
};

function safeFromCodePoint(code: number): string {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

// MyMemory sometimes returns HTML entities (&#39;, &quot;) in plain-text results
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => safeFromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeFromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function createMyMemoryProvider(email?: string): TranslationProvider {
  return {
    name: "mymemory",
    maxBytes: 500,
    async translate(text, from, to) {
      const params = new URLSearchParams({ q: text, langpair: `${from}|${to}`, mt: "1" });
      if (email) params.set("de", email);

      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}?${params.toString()}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ProviderError("unavailable", "MyMemory request failed");
      }

      if (response.status === 429) throw new ProviderError("quota", "MyMemory quota exceeded");
      if (!response.ok)
        throw new ProviderError("unavailable", `MyMemory status ${response.status}`);

      const body = (await response.json().catch(() => null)) as MyMemoryResponse | null;
      const translated = body?.responseData?.translatedText;
      const details = `${body?.responseDetails ?? ""} ${translated ?? ""}`;

      // The daily limit is reported inside a normal-looking response
      if (Number(body?.responseStatus) === 429 || /MYMEMORY WARNING/i.test(details)) {
        throw new ProviderError("quota", "MyMemory quota exceeded");
      }
      if (
        Number(body?.responseStatus) !== 200 ||
        typeof translated !== "string" ||
        translated.trim() === ""
      ) {
        throw new ProviderError("badResponse", "MyMemory returned no translation");
      }

      return decodeHtmlEntities(translated);
    },
  };
}
