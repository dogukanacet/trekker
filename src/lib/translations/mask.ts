export type MaskedText = { text: string; tokens: string[] };

// Simple arguments ({name}, {n, number}) and rich text tags (<b>, </b>)
const PLACEHOLDER_PATTERN = /\{[^{}]*\}|<\/?[A-Za-z][\w-]*\s*\/?>/g;

// Replaces every placeholder with a numbered token that translation engines
// usually copy through unchanged. Returns null for messages this approach cannot
// handle safely: plural/select (nested braces) and unbalanced braces.
export function maskPlaceholders(text: string): MaskedText | null {
  const tokens: string[] = [];
  const masked = text.replace(PLACEHOLDER_PATTERN, (match) => {
    tokens.push(match);
    return `{${tokens.length - 1}}`;
  });

  // Any brace left after removing our own tokens means nested or unbalanced syntax
  if (/[{}]/.test(masked.replace(/\{\d+\}/g, ""))) return null;
  return { text: masked, tokens };
}

// Puts the original placeholders back. Tolerates spaces the engine may add ("{ 0 }").
export function unmaskPlaceholders(text: string, tokens: string[]): string {
  let output = "";
  let cursor = 0;

  for (const match of text.matchAll(/\{\s*(\d+)\s*\}/g)) {
    const index = match.index ?? 0;
    const token = tokens[Number(match[1])];
    output += text.slice(cursor, index);

    if (token === undefined) {
      // Unknown number: keep it so the placeholder validation reports it
      output += match[0];
    } else {
      // In ICU an apostrophe right before "{" starts quoted text, so double it
      if (token.startsWith("{") && output.endsWith("'") && !output.endsWith("''")) {
        output += "'";
      }
      output += token;
    }
    cursor = index + match[0].length;
  }

  return output + text.slice(cursor);
}

// False when the text has no letters left once the tokens are removed
export function hasTranslatableText(maskedText: string): boolean {
  return /\p{L}/u.test(maskedText.replace(/\{\d+\}/g, ""));
}
