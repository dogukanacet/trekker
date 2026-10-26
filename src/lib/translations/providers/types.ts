import type { ProviderId } from "./meta";

export type { ProviderId };

export type ProviderErrorCode = "quota" | "unavailable" | "badResponse";

export class ProviderError extends Error {
  code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}

export type TranslationProvider = {
  name: ProviderId;
  // Longest text (in UTF-8 bytes) one request can carry
  maxBytes: number;
  translate(text: string, from: string, to: string): Promise<string>;
  // Optional: translates several texts in one request, results in the same order.
  // Providers with tight request limits implement it.
  translateMany?(texts: string[], from: string, to: string): Promise<string[]>;
};
