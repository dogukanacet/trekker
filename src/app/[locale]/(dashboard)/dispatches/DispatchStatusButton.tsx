"use client";

import { useState } from "react";
import type { DispatchStatus } from "@prisma/client";
import { Check, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { advanceDispatchStatus } from "@/app/[locale]/(dashboard)/dispatches/actions";
import { NEXT_DISPATCH_STATUS } from "@/lib/dispatch-status";

export function DispatchStatusButton({
  dispatchId,
  status,
}: {
  dispatchId: string;
  status: DispatchStatus;
}) {
  const t = useTranslations("Dispatches");
  const [isPending, setIsPending] = useState(false);

  // Only PLANNED and IN_PROGRESS have a next step; finished or cancelled rows get no button.
  if (!NEXT_DISPATCH_STATUS[status]) return null;
  const isStart = status === "PLANNED";

  const handleClick = async () => {
    setIsPending(true);
    // Sends the status the user saw; the server rejects the request if it changed in the meantime.
    const result = await advanceDispatchStatus(dispatchId, status, { error: null, success: false });
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isStart ? t("startedToast") : t("completedToast"));
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isStart ? (
        <Play className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {isStart ? t("startAction") : t("completeAction")}
    </Button>
  );
}
