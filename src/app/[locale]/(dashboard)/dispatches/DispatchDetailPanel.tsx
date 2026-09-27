"use client";

import { useEffect, useState } from "react";
import * as dispatchActions from "@/app/[locale]/(dashboard)/dispatches/actions";
import { dispatchStatusColors } from "@/lib/status-colors";
import { useTranslations } from "next-intl";
import type { DispatchStatus } from "@prisma/client";

type HistoryEntry = { id: string; status: DispatchStatus; changedAt: Date };

export function DispatchDetailPanel({ dispatchId }: { dispatchId: string }) {
  const t = useTranslations("Dispatches");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusLabels: Record<DispatchStatus, string> = {
    PLANNED: t("planned"),
    IN_PROGRESS: t("inProgress"),
    COMPLETED: t("completed"),
    CANCELLED: t("cancelled"),
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    dispatchActions.getDispatchDetail(dispatchId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else setHistory(result.history);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatchId]);

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("loadingHistory")}</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (!history || history.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("noHistory")}</div>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium mb-2">{t("statusHistory")}</p>
      <ul className="relative border-l pl-4 space-y-4">
        {history.map((entry, index) => (
          <li key={entry.id} className="relative">
            <span
              className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background"
              style={{ backgroundColor: index === history.length - 1 ? "currentColor" : undefined }}
            />
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[entry.status]}`}
            >
              {statusLabels[entry.status]}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(entry.changedAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
