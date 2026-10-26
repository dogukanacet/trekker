export const PROVIDER_IDS = ["gemini", "cloudflare", "mymemory"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini",
  cloudflare: "Cloudflare Workers AI",
  mymemory: "MyMemory",
};
