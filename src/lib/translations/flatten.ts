export type FlatEntry = { namespace: string; key: string; value: string };

// Flattens nested messages into namespace + dot-path entries.
// Top-level strings (no namespace) and arrays are skipped on purpose.
export function flattenMessages(messages: Record<string, unknown>): FlatEntry[] {
  const out: FlatEntry[] = [];

  function walk(node: unknown, path: string[]) {
    if (typeof node === "string") {
      const [namespace, ...rest] = path;
      if (namespace && rest.length > 0) {
        out.push({ namespace, key: rest.join("."), value: node });
      }
      return;
    }
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) {
        walk(v, [...path, k]);
      }
    }
  }

  walk(messages, []);
  return out;
}
