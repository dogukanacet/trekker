"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReleaseItemView, ReleaseSummary } from "@/lib/translations/releases";
import { getReleaseItems, revertRelease } from "@/app/[locale]/(dashboard)/translations/actions";

type LoadedItems = { items: ReleaseItemView[]; truncated: boolean };

export function ReleaseHistoryDialog({ releases }: { releases: ReleaseSummary[] }) {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");
  const uiLocale = useLocale();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [itemsById, setItemsById] = useState<Record<string, LoadedItems>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleDetails = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (itemsById[id]) return;

    setLoadingId(id);
    const result = await getReleaseItems(id);
    setLoadingId(null);

    if (result.error || !result.items) {
      toast.error(result.error ?? t("invalidInput"));
      return;
    }
    const loaded: LoadedItems = { items: result.items, truncated: result.truncated ?? false };
    setItemsById((previous) => ({ ...previous, [id]: loaded }));
  };

  const handleRevert = (id: string) => {
    setRevertingId(id);
    startTransition(async () => {
      const result = await revertRelease({ releaseId: id });
      setRevertingId(null);
      setConfirmingId(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      const reverted = result.count ?? 0;
      const skipped = result.skipped ?? 0;
      if (skipped > 0) toast.warning(t("revertPartial", { reverted, skipped }));
      else toast.success(t("revertDone", { count: reverted }));
    });
  };

  const display = (value: string | null) => value ?? t("valueNone");

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <History className="mr-1 h-4 w-4" />
        {t("history")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("historyTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("historyHint")}</p>

        {releases.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("historyEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {releases.map((release) => {
              const isExpanded = expandedId === release.id;
              const loaded = itemsById[release.id];
              const isConfirming = confirmingId === release.id;
              const isReverting = revertingId === release.id;

              return (
                <li key={release.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            release.kind === "PUBLISH"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          }`}
                        >
                          {release.kind === "PUBLISH" ? t("releasePublish") : t("releaseRevert")}
                        </span>
                        <span className="text-sm">
                          {new Date(release.createdAt).toLocaleString(uiLocale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {release.user ?? t("unknownUser")} ·{" "}
                        {t("releaseItems", { count: release.itemCount })}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isConfirming ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => setConfirmingId(null)}
                          >
                            {common("cancel")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isPending}
                            onClick={() => handleRevert(release.id)}
                          >
                            {isReverting ? common("updating") : t("revertConfirm")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => setConfirmingId(release.id)}
                        >
                          {t("revert")}
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-7 px-2 text-xs"
                    onClick={() => toggleDetails(release.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                    )}
                    {isExpanded ? t("hideDetails") : t("showDetails")}
                  </Button>

                  {isExpanded && (
                    <div className="space-y-2 border-t pt-2">
                      {loadingId === release.id && (
                        <p className="text-xs text-muted-foreground">{t("detailsLoading")}</p>
                      )}
                      {loaded && (
                        <>
                          <ul className="space-y-2">
                            {loaded.items.map((item) => (
                              <li key={item.id} className="space-y-0.5 text-xs">
                                <p className="break-all font-mono">
                                  {item.locale.toUpperCase()} · {item.path}
                                </p>
                                <p className="break-words text-muted-foreground line-through">
                                  {display(item.previousValue)}
                                </p>
                                <p className="break-words">{display(item.newValue)}</p>
                              </li>
                            ))}
                          </ul>
                          {loaded.truncated && (
                            <p className="text-xs text-muted-foreground">
                              {t("detailsTruncated", { count: loaded.items.length })}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
