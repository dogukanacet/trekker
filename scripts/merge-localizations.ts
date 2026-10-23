import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIRECTORY = path.resolve(process.cwd(), "localizations");
const OUTPUT_FILE = "translations.json";

type Problem = { file: string; keyPath: string; reason: string };

function flatten(
  node: unknown,
  trail: string[],
  out: Record<string, string>,
  problems: Problem[],
  file: string,
): void {
  const keyPath = trail.join(".");

  if (typeof node === "string") {
    if (trail.length < 2) {
      problems.push({ file, keyPath, reason: "top-level text without a namespace" });
    } else {
      out[keyPath] = node;
    }
    return;
  }

  if (typeof node === "object" && node !== null && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (key.includes(".") || key === "") {
        problems.push({
          file,
          keyPath: `${keyPath}.${key}`,
          reason: "key is empty or contains a dot",
        });
        continue;
      }
      flatten(value, [...trail, key], out, problems, file);
    }
    return;
  }

  problems.push({
    file,
    keyPath,
    reason: Array.isArray(node) ? "array" : `unsupported value (${typeof node})`,
  });
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function main(): void {
  const files = readdirSync(DIRECTORY).filter(
    (name) => name.endsWith(".json") && name !== OUTPUT_FILE,
  );
  if (files.length === 0) {
    console.error(`No locale files found in ${DIRECTORY}`);
    process.exit(1);
  }

  const problems: Problem[] = [];
  const merged: Record<string, Record<string, string>> = {};

  for (const file of files.sort(compareKeys)) {
    const locale = path.basename(file, ".json");
    const parsed: unknown = JSON.parse(readFileSync(path.join(DIRECTORY, file), "utf8"));
    const flat: Record<string, string> = {};
    flatten(parsed, [], flat, problems, file);

    // Sorted keys keep diffs small and namespaces grouped
    merged[locale] = Object.fromEntries(Object.entries(flat).sort(([a], [b]) => compareKeys(a, b)));
  }

  if (problems.length > 0) {
    console.error("Nothing was written. These entries cannot be represented in the flat format:\n");
    for (const problem of problems) {
      console.error(`  ${problem.file}: ${problem.keyPath} (${problem.reason})`);
    }
    process.exit(1);
  }

  writeFileSync(path.join(DIRECTORY, OUTPUT_FILE), `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  console.log(`Wrote localizations/${OUTPUT_FILE}`);
  for (const [locale, entries] of Object.entries(merged)) {
    console.log(`  ${locale}: ${Object.keys(entries).length} keys`);
  }
  console.log("\nThe old files were NOT deleted:");
  for (const file of files) console.log(`  localizations/${file}`);
}

main();
