import { DispatchStatus } from "@prisma/client";

export const dispatchStatusColors: Record<DispatchStatus, string> = {
  [DispatchStatus.PLANNED]: "bg-muted text-muted-foreground",
  [DispatchStatus.IN_PROGRESS]: "bg-blue-500/10 text-blue-500",
  [DispatchStatus.COMPLETED]: "bg-green-500/10 text-green-500",
  [DispatchStatus.CANCELLED]: "bg-destructive/10 text-destructive",
};
