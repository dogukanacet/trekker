import type { ProviderId } from "./providers/meta";
import type { ProviderPlan } from "./providers";
import { translateTexts, type FailureReason, type TranslateOutcome } from "./translate";

export type ProviderSwitch = { from: ProviderId; to: ProviderId };

// Failures another service may not have: no quota left, or it could not be reached
function isServiceFailure(reason: FailureReason): boolean {
  return reason === "quota" || reason === "unavailable";
}

// Translates with the primary provider and retries only the texts that failed for a service
// reason with each fallback in turn. Texts that failed for their own reasons (plural,
// broken placeholders) are never retried: another service would not change that.
export async function translateTextsWithFallback(
  plan: ProviderPlan,
  texts: string[],
  from: string,
  to: string,
): Promise<{ outcomes: TranslateOutcome[]; used: ProviderId; switched: ProviderSwitch[] }> {
  const outcomes = await translateTexts(plan.primary, texts, from, to);
  const switched: ProviderSwitch[] = [];
  let used = plan.primary.name;

  for (const next of plan.fallbacks) {
    const retryIndexes = outcomes.flatMap((outcome, index) =>
      !outcome.ok && isServiceFailure(outcome.reason) ? [index] : [],
    );
    if (retryIndexes.length === 0) break;

    const retried = await translateTexts(
      next,
      retryIndexes.map((index) => texts[index] ?? ""),
      from,
      to,
    );
    switched.push({ from: used, to: next.name });
    used = next.name;

    retryIndexes.forEach((originalIndex, position) => {
      const outcome = retried[position];
      if (outcome) outcomes[originalIndex] = outcome;
    });
  }

  return { outcomes, used, switched };
}

export function dedupeSwitches(switches: ProviderSwitch[]): ProviderSwitch[] {
  const seen = new Set<string>();
  return switches.filter((change) => {
    const key = `${change.from}>${change.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
