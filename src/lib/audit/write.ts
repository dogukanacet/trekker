import type { AuditAction, Prisma } from "@prisma/client";
import type { Resource } from "@/lib/permissions";
import type { Changes } from "./diff";

type AuditInput = {
  tenantId: string;
  actor: { id: string; email: string };
  action: AuditAction;
  resource: Resource;
  resourceId: string;
  resourceLabel?: string;
  changes?: Changes | null;
};

// Takes the transaction client on purpose: the log row commits or rolls back
// together with the change it describes. Pass `prisma` itself for non-transactional use.
export async function writeAudit(db: Prisma.TransactionClient, input: AuditInput) {
  // A save that changed nothing is not worth a log row.
  if (input.action === "UPDATE" && !input.changes) return;

  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.actor.id,
      actorEmail: input.actor.email,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      resourceLabel: input.resourceLabel,
      changes: input.changes ? (input.changes as Prisma.InputJsonObject) : undefined,
    },
  });
}
