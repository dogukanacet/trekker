"use client";

import { useTranslations } from "next-intl";
import type { Changes } from "@/lib/audit/diff";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

export function useAuditFormat() {
  const t = useTranslations("AuditLog");
  const dispatches = useTranslations("Dispatches");

  const statusLabels: Record<string, string> = {
    PLANNED: dispatches("planned"),
    IN_PROGRESS: dispatches("inProgress"),
    COMPLETED: dispatches("completed"),
    CANCELLED: dispatches("cancelled"),
  };

  // Field names come from the database, so a label may not exist yet: fall back to the raw name.
  const dynamic = t as unknown as { (key: string): string; has(key: string): boolean };
  const fieldLabel = (field: string) =>
    dynamic.has(`fields.${field}`) ? dynamic(`fields.${field}`) : field;

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "string") {
      if (field === "status" && statusLabels[value]) return statusLabels[value];
      if (ISO_DATE.test(value)) return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  const parseChanges = (json: unknown): Changes | null => {
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return json as Changes;
  };

  // One-line text for the grid column and the CSV/PDF export.
  const summarize = (json: unknown): string => {
    const changes = parseChanges(json);
    if (!changes) return "";
    return Object.entries(changes)
      .map(
        ([field, c]) =>
          `${fieldLabel(field)}: ${formatValue(field, c.from)} → ${formatValue(field, c.to)}`,
      )
      .join("; ");
  };

  return { fieldLabel, formatValue, parseChanges, summarize };
}
