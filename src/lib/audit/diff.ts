export type FieldChange = { from: unknown; to: unknown };
export type Changes = Record<string, FieldChange>;

// Never persisted, whatever the caller passes in.
const SENSITIVE_KEYS = new Set(["passwordHash", "tokenHash"]);

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

// Returns null when nothing changed, so callers can skip writing a no-op entry.
// Create = diffRecords({}, after), delete = diffRecords(before, {}).
export function diffRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Changes | null {
  const changes: Changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (SENSITIVE_KEYS.has(key)) continue;
    const from = normalize(before[key]);
    const to = normalize(after[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from, to };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
