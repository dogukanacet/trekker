import { CLOUDFLARE_MODEL, createCloudflareProvider } from "./cloudflare";
import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "./gemini";
import { PROVIDER_IDS, type ProviderId } from "./meta";
import { createMyMemoryProvider } from "./mymemory";
import type { TranslationProvider } from "./types";

export type ProviderStatus = {
  id: ProviderId;
  configured: boolean;
  // Non-secret detail shown in the settings dialog (the model name)
  detail: string | null;
};

export type ProviderPlan = {
  primary: TranslationProvider;
  // Tried in this order when the primary one is out of quota or unreachable
  fallbacks: TranslationProvider[];
};

const geminiModel = () => process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
const myMemoryEmail = () => process.env.MYMEMORY_EMAIL?.trim() || undefined;

// Returns null when the provider's credentials are missing
function createProvider(id: ProviderId): TranslationProvider | null {
  switch (id) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      return apiKey ? createGeminiProvider(apiKey, geminiModel()) : null;
    }
    case "cloudflare": {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
      const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
      return accountId && apiToken ? createCloudflareProvider(accountId, apiToken) : null;
    }
    case "mymemory":
      // Works without any configuration
      return createMyMemoryProvider(myMemoryEmail());
  }
}

function getConfiguredProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((id) => createProvider(id) !== null);
}

// TRANSLATION_PROVIDER when it is usable, otherwise the first configured service
function getDefaultProviderId(): ProviderId {
  const configured = getConfiguredProviders();
  const wanted = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase();

  const forced = configured.find((id) => id === wanted);
  if (forced) return forced;
  if (wanted) {
    console.warn(
      `TRANSLATION_PROVIDER "${wanted}" is unknown or not configured, using the first available service`,
    );
  }
  return configured[0] ?? "mymemory";
}

// An unknown or unconfigured `preferred` id (e.g. a stale browser setting) falls back to the default
export function planProviders(
  preferred: string | null | undefined,
  fallback: boolean,
): ProviderPlan {
  const configured = getConfiguredProviders();
  const startId = configured.find((id) => id === preferred) ?? getDefaultProviderId();
  const primary = createProvider(startId) ?? createMyMemoryProvider(myMemoryEmail());

  const fallbacks = fallback
    ? configured
        .filter((id) => id !== primary.name)
        .flatMap((id) => {
          const provider = createProvider(id);
          return provider ? [provider] : [];
        })
    : [];

  return { primary, fallbacks };
}

function describeProvider(id: ProviderId): string | null {
  if (id === "gemini") return geminiModel();
  if (id === "cloudflare") return CLOUDFLARE_MODEL;
  return null;
}

// Safe to send to the browser: ids, flags and model names only, never credentials
export function getProviderStatuses(): { providers: ProviderStatus[]; defaultId: ProviderId } {
  return {
    providers: PROVIDER_IDS.map((id) => ({
      id,
      configured: createProvider(id) !== null,
      detail: describeProvider(id),
    })),
    defaultId: getDefaultProviderId(),
  };
}
