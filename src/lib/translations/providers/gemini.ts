import { ProviderError, type TranslationProvider } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// Flash-Lite models have the most generous free allowance; override with GEMINI_MODEL
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const TIMEOUT_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 12_000;
const DEFAULT_MINUTE_WAIT_MS = 8_000;

const SYSTEM_PROMPT = [
  "You translate short user interface texts of a web application.",
  "Rules:",
  "- Tokens like {0}, {1} or {2} are placeholders. Copy each one exactly as written, with its braces and number. You may move a token where the target grammar needs it, but never translate, remove, duplicate or invent tokens.",
  "- Keep URLs and product names unchanged.",
  "- Use the concise, neutral tone of software interfaces (short imperative verbs on buttons).",
  "- Output only the translations, without comments or explanations.",
].join("\n");

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
const languageName = (code: string) => languageNames.of(code) ?? code;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Returns how long to wait before retrying a 429, or null when waiting will not help
function getRetryWaitMs(raw: string): number | null {
  // A daily quota resets at a fixed time, so waiting a few seconds is pointless
  if (/PerDay|per day/i.test(raw)) return null;

  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(raw);
  const waitMs = match?.[1] ? Math.ceil(Number(match[1]) * 1000) : DEFAULT_MINUTE_WAIT_MS;
  return waitMs <= MAX_RETRY_WAIT_MS ? waitMs : null;
}

async function generate(apiKey: string, model: string, body: unknown): Promise<string> {
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ProviderError("unavailable", "Gemini request failed");
    }
    const raw = await response.text();

    if (response.status === 429) {
      const waitMs = attempt < MAX_RATE_LIMIT_RETRIES ? getRetryWaitMs(raw) : null;
      if (waitMs === null) {
        throw new ProviderError("quota", "Gemini quota or rate limit reached");
      }
      await sleep(waitMs + 250);
      continue;
    }
    if (!response.ok) {
      // 400/403 usually mean a wrong key or a model the key cannot use
      throw new ProviderError("unavailable", `Gemini status ${response.status}`);
    }

    let parsed: GeminiResponse;
    try {
      parsed = JSON.parse(raw) as GeminiResponse;
    } catch {
      throw new ProviderError("badResponse", "Gemini returned invalid JSON");
    }

    const candidate = parsed.candidates?.[0];
    if (!candidate || parsed.promptFeedback?.blockReason) {
      throw new ProviderError("badResponse", "Gemini returned no candidate");
    }
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      throw new ProviderError("badResponse", `Gemini stopped early (${candidate.finishReason})`);
    }

    const text = (candidate.content?.parts ?? []).map((part) => part.text ?? "").join("");
    if (text.trim() === "") throw new ProviderError("badResponse", "Gemini returned empty text");
    return text;
  }
}

async function translateMany(
  apiKey: string,
  model: string,
  texts: string[],
  from: string,
  to: string,
): Promise<string[]> {
  const prompt = [
    `Translate every string of the following JSON array from ${languageName(from)} to ${languageName(to)}.`,
    `Return only a JSON array with exactly ${texts.length} strings in the same order.`,
    "",
    JSON.stringify(texts),
  ].join("\n");

  const output = await generate(apiKey, model, {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });

  let parsed: unknown;
  try {
    // Models occasionally wrap JSON in a code fence even when asked not to
    parsed = JSON.parse(
      output
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    throw new ProviderError("badResponse", "Gemini returned a non-JSON answer");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length !== texts.length ||
    !parsed.every((item): item is string => typeof item === "string")
  ) {
    throw new ProviderError("badResponse", "Gemini returned the wrong number of translations");
  }
  return parsed;
}

export function createGeminiProvider(apiKey: string, model: string): TranslationProvider {
  return {
    name: "gemini",
    maxBytes: 2000,
    async translate(text, from, to) {
      const [first] = await translateMany(apiKey, model, [text], from, to);
      if (first === undefined) throw new ProviderError("badResponse", "Gemini returned nothing");
      return first;
    },
    translateMany: (texts, from, to) => translateMany(apiKey, model, texts, from, to),
  };
}
