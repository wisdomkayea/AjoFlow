import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "./auditService";

/**
 * Generates the payout sequence for a group based on each member's
 * assigned payoutOrder. Safe to call multiple times: only missing
 * slots are created (idempotent).
 */
export async function generatePayoutSequence(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError("Group not found", 404);
  if (group.adminId !== adminId) {
    throw new ApiError("Only the group admin can generate the payout sequence", 403);
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { payoutOrder: "asc" }
  });
  if (members.length === 0) {
    throw new ApiError("Group has no members to schedule payouts for", 400);
  }

  const existing = await prisma.payout.findMany({ where: { groupId } });
  const existingOrders = new Set(existing.map((p) => p.payoutOrder));

  const toCreate = members
    .filter((m) => !existingOrders.has(m.payoutOrder))
    .map((m) => ({
      groupId,
      memberId: m.userId,
      payoutOrder: m.payoutOrder,
      status: "PENDING" as const
    }));

  if (toCreate.length > 0) {
    await prisma.payout.createMany({ data: toCreate });
  }

  await logAudit({
    actorId: adminId,
    action: "PAYOUT_SEQUENCE_GENERATED",
    entityType: "Group",
    entityId: groupId,
    metadata: { createdSlots: toCreate.length }
  });

  return prisma.payout.findMany({
    where: { groupId },
    include: { member: true },
    orderBy: { payoutOrder: "asc" }
  });
}

/**
 * Completes the next payout in strict order. Refuses to complete out of
 * sequence and refuses to complete a payout twice (prevents duplicate
 * payouts / a member receiving a payout twice in the same cycle).
 */
export async function completeNextPayout(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError("Group not found", 404);
  if (group.adminId !== adminId) {
    throw new ApiError("Only the group admin can complete payouts", 403);
  }

  return prisma.$transaction(async (tx) => {
    const next = await tx.payout.findFirst({
      where: { groupId, status: "PENDING" },
      orderBy: { payoutOrder: "asc" }
    });

    if (!next) {
      throw new ApiError("There is no pending payout left in this cycle", 400);
    }

    const completedPayoutsCount = await tx.payout.count({
      where: { groupId, status: "COMPLETED" }
    });
    const requiredPaidCountPerMember = completedPayoutsCount + 1;

    const members = await tx.groupMember.findMany({
      where: { groupId },
      select: { userId: true }
    });

    if (members.length === 0) {
      throw new ApiError("Group has no members to process payout for", 400);
    }

    const paidCounts = await tx.contribution.groupBy({
      by: ["memberId"],
      where: { groupId, status: "PAID" },
      _count: { _all: true }
    });

    const paidCountByMemberId = new Map<string, number>(
      paidCounts.map((entry) => [entry.memberId, entry._count._all])
    );

    const hasUnpaidMembers = members.some(
      (member) => (paidCountByMemberId.get(member.userId) ?? 0) < requiredPaidCountPerMember
    );

    if (hasUnpaidMembers) {
      throw new ApiError("Could not complete payout till every member completes payment", 400);
    }

    // Guard: re-check status inside the transaction to prevent a race where
    // two concurrent requests both complete the same payout.
    const updated = await tx.payout.updateMany({
      where: { id: next.id, status: "PENDING" },
      data: { status: "COMPLETED", paidAt: new Date() }
    });

    if (updated.count === 0) {
      throw new ApiError("This payout has already been completed", 409);
    }

    const result = await tx.payout.findUnique({ where: { id: next.id }, include: { member: true } });
    return result;
  }).then(async (payout) => {
    await logAudit({
      actorId: adminId,
      action: "PAYOUT_COMPLETED",
      entityType: "Payout",
      entityId: payout!.id,
      metadata: { groupId, memberId: payout!.memberId, payoutOrder: payout!.payoutOrder }
    });
    return payout;
  });
}

/**
 * Restarts a completed payout cycle by resetting all payout slots in the group
 * back to PENDING. This is only allowed once every slot in the current cycle
 * has been completed.
 */
export async function restartPayoutCycle(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError("Group not found", 404);
  if (group.adminId !== adminId) {
    throw new ApiError("Only the group admin can restart payout cycles", 403);
  }

  const existing = await prisma.payout.findMany({ where: { groupId } });
  if (existing.length === 0) {
    throw new ApiError("No payout schedule exists yet for this group", 400);
  }

  const hasPending = existing.some((p) => p.status === "PENDING");
  if (hasPending) {
    throw new ApiError("Cannot restart cycle until all members have received payout", 400);
  }

  await prisma.payout.updateMany({
    where: { groupId },
    data: { status: "PENDING", paidAt: null }
  });

  await logAudit({
    actorId: adminId,
    action: "PAYOUT_CYCLE_RESTARTED",
    entityType: "Group",
    entityId: groupId,
    metadata: { slotsReset: existing.length }
  });

  return prisma.payout.findMany({
    where: { groupId },
    include: { member: true },
    orderBy: { payoutOrder: "asc" }
  });
}

export async function getPayoutSchedule(groupId: string) {
  return prisma.payout.findMany({
    where: { groupId },
    include: { member: true },
    orderBy: { payoutOrder: "asc" }
  });
}
