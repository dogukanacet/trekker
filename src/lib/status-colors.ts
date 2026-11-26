import { DispatchStatus } from "@prisma/client";

export const dispatchStatusColors: Record<DispatchStatus, string> = {
  [DispatchStatus.PLANNED]: "bg-muted text-muted-foreground",
  [DispatchStatus.IN_PROGRESS]: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  [DispatchStatus.COMPLETED]: "bg-green-500/10 text-green-700 dark:text-green-400",
  [DispatchStatus.CANCELLED]: "bg-destructive/10 text-destructive",
};
