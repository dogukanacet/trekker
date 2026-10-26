import { hasTranslatableText, maskPlaceholders, unmaskPlaceholders, type MaskedText } from "./mask";
import { ProviderError, type TranslationProvider } from "./providers/types";
import { validateTranslation } from "./validate";

export type FailureReason =
  "unsupported" | "tooLong" | "quota" | "unavailable" | "noResult" | "placeholders" | "syntax";

export type TranslateOutcome = { ok: true; text: string } | { ok: false; reason: FailureReason };

const encoder = new TextEncoder();
const CONCURRENCY = 3;

function reasonFromError(error: unknown): FailureReason {
  if (error instanceof ProviderError) {
    if (error.code === "quota") return "quota";
    if (error.code === "badResponse") return "noResult";
  } else {
    // Never log the texts themselves, only what went wrong
    console.error("Translation request failed:", error instanceof Error ? error.message : error);
  }
  return "unavailable";
}

// Puts the placeholders back and keeps the result only when they all survived
function finish(original: string, masked: MaskedText, raw: string): TranslateOutcome {
  if (raw.trim() === "") return { ok: false, reason: "noResult" };

  const restored = unmaskPlaceholders(raw.trim(), masked.tokens);
  const issue = validateTranslation(restored, original);
  if (issue) return { ok: false, reason: issue.type === "syntax" ? "syntax" : "placeholders" };

  return { ok: true, text: restored };
}

// Translates several texts into one language. Outcomes keep the order of `texts`.
export async function translateTexts(
  provider: TranslationProvider,
  texts: string[],
  from: string,
  to: string,
): Promise<TranslateOutcome[]> {
  const outcomes: (TranslateOutcome | undefined)[] = texts.map(() => undefined);
  const pending: { index: number; text: string; masked: MaskedText }[] = [];

  texts.forEach((text, index) => {
    const masked = maskPlaceholders(text);
    if (masked === null) {
      outcomes[index] = { ok: false, reason: "unsupported" };
    } else if (!hasTranslatableText(masked.text)) {
      // Nothing to translate (e.g. only placeholders): keep the text as it is
      outcomes[index] = { ok: true, text };
    } else if (encoder.encode(masked.text).length > provider.maxBytes) {
      outcomes[index] = { ok: false, reason: "tooLong" };
    } else {
      pending.push({ index, text, masked });
    }
  });

  if (pending.length > 0 && provider.translateMany) {
    try {
      const raws = await provider.translateMany(
        pending.map((item) => item.masked.text),
        from,
        to,
      );
      if (raws.length !== pending.length) {
        throw new ProviderError("badResponse", "Result count mismatch");
      }
      pending.forEach((item, position) => {
        outcomes[item.index] = finish(item.text, item.masked, raws[position] ?? "");
      });
    } catch (error) {
      const reason = reasonFromError(error);
      for (const item of pending) outcomes[item.index] = { ok: false, reason };
    }
  } else if (pending.length > 0) {
    // One request per text, a few at a time. Stop as soon as the service is out of
    // quota or down, so the remaining texts do not waste time or allowance.
    const state: { stopReason: FailureReason | null; next: number } = {
      stopReason: null,
      next: 0,
    };

    const worker = async () => {
      while (state.stopReason === null) {
        const item = pending[state.next++];
        if (!item) return;

        try {
          const raw = await provider.translate(item.masked.text, from, to);
          outcomes[item.index] = finish(item.text, item.masked, raw);
        } catch (error) {
          const reason = reasonFromError(error);
          outcomes[item.index] = { ok: false, reason };
          if (reason === "quota" || reason === "unavailable") state.stopReason = reason;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()),
    );

    // Texts that were never attempted because the service stopped
    for (const item of pending) {
      if (outcomes[item.index] === undefined) {
        outcomes[item.index] = { ok: false, reason: state.stopReason ?? "unavailable" };
      }
    }
  }

  return texts.map((_, index) => outcomes[index] ?? { ok: false, reason: "unavailable" });
}

export async function translateText(
  provider: TranslationProvider,
  text: string,
  from: string,
  to: string,
): Promise<TranslateOutcome> {
  const [outcome] = await translateTexts(provider, [text], from, to);
  return outcome ?? { ok: false, reason: "unavailable" };
}
