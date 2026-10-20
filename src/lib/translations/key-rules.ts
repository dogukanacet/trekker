const SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;
// Segments that would let a key walk into Object.prototype
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
export const MAX_KEY_DEPTH = 4;

export function isValidSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment) && !FORBIDDEN_SEGMENTS.has(segment);
}

export function isValidNamespace(namespace: string): boolean {
  return isValidSegment(namespace);
}

// key is the dot-separated path inside a namespace, e.g. "export.csv"
export function isValidKeyPath(key: string): boolean {
  const segments = key.split(".");
  return segments.length <= MAX_KEY_DEPTH && segments.every(isValidSegment);
}

export type KeyConflict = "exists" | "insideExisting" | "parentOfExisting";

// existingIds are "namespace.key" strings of every known leaf key
export function findKeyConflict(
  namespace: string,
  key: string,
  existingIds: string[],
): KeyConflict | null {
  const id = `${namespace}.${key}`;
  const ids = new Set(existingIds);

  if (ids.has(id)) return "exists";

  // A proper prefix of the new path is already a leaf (a string), so it cannot hold children
  const parts = id.split(".");
  for (let length = 2; length < parts.length; length++) {
    if (ids.has(parts.slice(0, length).join("."))) return "insideExisting";
  }

  // The new path is already a parent of existing keys
  const childPrefix = `${id}.`;
  if (existingIds.some((existing) => existing.startsWith(childPrefix))) return "parentOfExisting";

  return null;
}

// True when nothing (string, object, array) occupies this path in the tree and
// no prefix of it is a non-object, so a new string can be placed there safely.
export function isPathFree(tree: Record<string, unknown>, segments: string[]): boolean {
  let node: unknown = tree;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment === undefined) return false;
    if (typeof node !== "object" || node === null || Array.isArray(node)) return false;
    if (!Object.hasOwn(node, segment)) return true;
    node = (node as Record<string, unknown>)[segment];
  }

  // Every segment exists, so the full path is already taken
  return false;
}
