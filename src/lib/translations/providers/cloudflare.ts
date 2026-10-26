import { ProviderError, type TranslationProvider } from "./types";

export const CLOUDFLARE_MODEL = "@cf/meta/m2m100-1.2b";
const TIMEOUT_MS = 20_000;

type CloudflareResponse = {
  success?: boolean;
  result?: { translated_text?: string };
  translated_text?: string;
};

export function createCloudflareProvider(accountId: string, apiToken: string): TranslationProvider {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${CLOUDFLARE_MODEL}`;

  return {
    name: "cloudflare",
    maxBytes: 1000,
    async translate(text, from, to) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text, source_lang: from, target_lang: to }),
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ProviderError("unavailable", "Cloudflare request failed");
      }

      const raw = await response.text();
      const overQuota = /daily free allocation/i.test(raw);

      if (!response.ok) {
        if (response.status === 429 || overQuota) {
          throw new ProviderError("quota", "Cloudflare daily allocation used up");
        }
        throw new ProviderError("unavailable", `Cloudflare status ${response.status}`);
      }

      let body: CloudflareResponse;
      try {
        body = JSON.parse(raw) as CloudflareResponse;
      } catch {
        throw new ProviderError("badResponse", "Cloudflare returned invalid JSON");
      }

      if (body.success === false) {
        throw new ProviderError(
          overQuota ? "quota" : "unavailable",
          "Cloudflare reported a failure",
        );
      }

      const translated = body.result?.translated_text ?? body.translated_text;
      if (typeof translated !== "string" || translated.trim() === "") {
        throw new ProviderError("badResponse", "Cloudflare returned no translation");
      }
      return translated;
    },
  };
}
