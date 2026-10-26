import { PROVIDER_IDS, type ProviderId } from "@/lib/translations/providers/meta";

const STORAGE_KEY = "trekker.translation-provider";

export type ProviderSettings = {
  // null = let the server pick its default
  provider: ProviderId | null;
  // Retry with the next service when the chosen one is out of quota or unreachable
  fallback: boolean;
};

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = { provider: null, fallback: false };

// Browser only. Anything unreadable or unknown falls back to the defaults.
export function readProviderSettings(): ProviderSettings {
  if (typeof window === "undefined") return DEFAULT_PROVIDER_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROVIDER_SETTINGS;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PROVIDER_SETTINGS;

    const { provider, fallback } = parsed as { provider?: unknown; fallback?: unknown };
    return {
      provider: PROVIDER_IDS.find((id) => id === provider) ?? null,
      fallback: fallback === true,
    };
  } catch {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

export function writeProviderSettings(settings: ProviderSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked (private mode); the choice then only lasts for this page
  }
}
