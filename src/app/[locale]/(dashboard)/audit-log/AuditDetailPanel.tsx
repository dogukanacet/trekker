"use client";

import { useTranslations } from "next-intl";
import { useAuditFormat } from "./useAuditFormat";

export function AuditDetailPanel({ changes }: { changes: unknown }) {
  const t = useTranslations("AuditLog");
  const { fieldLabel, formatValue, parseChanges } = useAuditFormat();
  const parsed = parseChanges(changes);

  if (!parsed) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">{t("detail.none")}</p>;
  }

  return (
    <div className="px-4 py-3">
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-4 font-medium">{t("detail.field")}</th>
            <th className="py-1 pr-4 font-medium">{t("detail.before")}</th>
            <th className="py-1 font-medium">{t("detail.after")}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(parsed).map(([field, change]) => (
            <tr key={field} className="border-t">
              <td className="py-1.5 pr-4 font-medium">{fieldLabel(field)}</td>
              <td className="py-1.5 pr-4 text-muted-foreground">
                {formatValue(field, change.from)}
              </td>
              <td className="py-1.5">{formatValue(field, change.to)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
