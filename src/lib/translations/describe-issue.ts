import { getTranslations } from "next-intl/server";
import type { ValidationIssue } from "./validate";

// Placeholder names are shown the way they are written in a message: {name} and <b>
function formatNames(names: string[]): string {
  return names.map((name) => (name.startsWith("<") ? name : `{${name}}`)).join(", ");
}

// Returns a function that turns a validation issue into a user-facing message
export async function getIssueDescriber() {
  const t = await getTranslations("Translations");

  return (issue: ValidationIssue): string => {
    if (issue.type === "syntax") return t("invalidSyntax");

    const parts: string[] = [];
    if (issue.missing.length > 0) {
      parts.push(t("placeholdersMissing", { names: formatNames(issue.missing) }));
    }
    if (issue.extra.length > 0) {
      parts.push(t("placeholdersExtra", { names: formatNames(issue.extra) }));
    }
    return parts.join(" ");
  };
}
