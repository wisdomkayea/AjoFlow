import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Records an immutable audit entry for a financial action.
 * Every mutation to contributions, payouts, and payments should call this.
 */
export async function logAudit(params: {
  actorId: string;
  action: string;
  entityType: "Contribution" | "Payout" | "Payment" | "Group" | "Installment" | "Product";
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? ({} as Prisma.InputJsonObject)
    }
  });
}
