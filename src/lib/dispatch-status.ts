import type { DispatchStatus } from "@prisma/client";

// Forward-only workflow that a driver may advance. Cancelling or reverting a dispatch
// stays with ADMIN/DISPATCHER through the regular edit flow.
export const NEXT_DISPATCH_STATUS: Partial<Record<DispatchStatus, DispatchStatus>> = {
  PLANNED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};
