import { parse } from "@formatjs/icu-messageformat-parser";

// Numeric values of the parser's element TYPE enum (the AST format is stable).
// The unit tests exercise every kind, so a mismatch would fail them.
const ELEMENT = {
  literal: 0,
  argument: 1,
  number: 2,
  date: 3,
  time: 4,
  select: 5,
  plural: 6,
  pound: 7,
  tag: 8,
} as const;

type AstNode = {
  type: number;
  value?: unknown;
  options?: Record<string, { value: AstNode[] }>;
  children?: AstNode[];
};

export type ValidationIssue =
  { type: "syntax" } | { type: "placeholders"; missing: string[]; extra: string[] };

function collectNames(nodes: AstNode[], into: Set<string>): void {
  for (const node of nodes) {
    switch (node.type) {
      case ELEMENT.argument:
      case ELEMENT.number:
      case ELEMENT.date:
      case ELEMENT.time:
        into.add(String(node.value));
        break;
      case ELEMENT.select:
      case ELEMENT.plural:
        into.add(String(node.value));
        // Every branch may reference further arguments
        for (const option of Object.values(node.options ?? {})) {
          collectNames(option.value, into);
        }
        break;
      case ELEMENT.tag:
        into.add(`<${String(node.value)}>`);
        collectNames(node.children ?? [], into);
        break;
      default:
        // literal text and the "#" of a plural carry no argument
        break;
    }
  }
}

// Returns every argument and tag name used by an ICU message,
// or null when the message is not valid ICU syntax.
export function getPlaceholderNames(message: string): Set<string> | null {
  try {
    const names = new Set<string>();
    collectNames(parse(message) as unknown as AstNode[], names);
    return names;
  } catch {
    return null;
  }
}

// reference: the text whose placeholders the translation must keep (null = syntax check only)
export function validateTranslation(
  value: string,
  reference: string | null,
): ValidationIssue | null {
  const actual = getPlaceholderNames(value);
  if (actual === null) return { type: "syntax" };
  if (reference === null) return null;

  // A broken reference cannot be compared against; its own owner has to fix it
  const expected = getPlaceholderNames(reference);
  if (expected === null) return null;

  const missing = [...expected].filter((name) => !actual.has(name)).sort();
  const extra = [...actual].filter((name) => !expected.has(name)).sort();

  return missing.length > 0 || extra.length > 0 ? { type: "placeholders", missing, extra } : null;
}
