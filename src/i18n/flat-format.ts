export type FlatMessages = Record<string, string>;
type Tree = Record<string, unknown>;

// Segments that would let a key reach Object.prototype
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

// Turns {"Common.export.csv": "CSV"} into {Common: {export: {csv: "CSV"}}}.
// Entries that cannot be placed are skipped and reported instead of thrown,
// so one bad line in the file can never take the whole site down.
export function unflattenMessages(flat: FlatMessages): { tree: Tree; skipped: string[] } {
  const tree: Tree = {};
  const skipped: string[] = [];

  for (const [id, value] of Object.entries(flat)) {
    const segments = id.split(".");
    const last = segments.at(-1);

    if (
      last === undefined ||
      typeof value !== "string" ||
      segments.some((segment) => segment === "" || FORBIDDEN_SEGMENTS.has(segment))
    ) {
      skipped.push(id);
      continue;
    }

    let node = tree;
    let placed = true;
    for (const segment of segments.slice(0, -1)) {
      const child = Object.hasOwn(node, segment) ? node[segment] : undefined;
      if (child === undefined) {
        const created: Tree = {};
        node[segment] = created;
        node = created;
      } else if (typeof child === "object" && child !== null && !Array.isArray(child)) {
        node = child as Tree;
      } else {
        // A shorter key is already a text, so this key cannot live below it
        placed = false;
        break;
      }
    }

    // The final segment is taken when a longer key already created it as an object
    if (!placed || Object.hasOwn(node, last)) {
      skipped.push(id);
      continue;
    }
    node[last] = value;
  }

  return { tree, skipped };
}
