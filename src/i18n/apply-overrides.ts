import { isPathFree, isValidSegment } from "../lib/translations/key-rules";

type Messages = Record<string, unknown>;

export type Override = {
  namespace: string;
  key: string;
  publishedValue: string | null;
};

// Overrides never create new keys: a path must already exist as a string
// in the base JSON, otherwise it is ignored.
export function applyOverrides(base: Messages, overrides: Override[]): Messages {
  // Clone so the shared JSON module object is never mutated
  const result = structuredClone(base);

  for (const { namespace, key, publishedValue } of overrides) {
    if (publishedValue === null) continue;

    const path = [namespace, ...key.split(".")];
    const last = path.at(-1);
    if (!last) continue;

    let node: unknown = result;
    for (const segment of path.slice(0, -1)) {
      if (typeof node !== "object" || node === null || !Object.hasOwn(node, segment)) {
        node = undefined;
        break;
      }
      node = (node as Messages)[segment];
    }

    if (
      typeof node === "object" &&
      node !== null &&
      Object.hasOwn(node, last) &&
      typeof (node as Messages)[last] === "string"
    ) {
      (node as Messages)[last] = publishedValue;
    }
  }

  return result;
}

export type CustomEntry = { namespace: string; key: string; value: string };

// Adds keys that do not exist in the base messages (keys created from the panel).
// Existing paths are never touched; those go through applyOverrides.
export function addCustomKeys(messages: Messages, entries: CustomEntry[]): Messages {
  const result = structuredClone(messages);

  for (const { namespace, key, value } of entries) {
    const segments = [namespace, ...key.split(".")];
    const last = segments.at(-1);
    if (!last || !segments.every(isValidSegment)) continue;
    if (!isPathFree(result, segments)) continue;

    // isPathFree guarantees every existing node on this path is a plain object
    let node = result;
    for (const segment of segments.slice(0, -1)) {
      if (!Object.hasOwn(node, segment)) node[segment] = {};
      node = node[segment] as Messages;
    }
    node[last] = value;
  }

  return result;
}
