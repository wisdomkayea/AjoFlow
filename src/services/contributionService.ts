import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { RecordContributionInput } from "@/lib/validation/contribution";
import { logAudit } from "./auditService";

export async function recordContribution(actorId: string, input: RecordContributionInput) {
  const contribution = await prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({ where: { id: input.groupId } });
    if (!group) throw new ApiError("Group not found", 404);

    const membership = await tx.groupMember.findUnique({
      where: { userId_groupId: { userId: input.memberId, groupId: input.groupId } }
    });
    if (!membership) throw new ApiError("This user is not a member of the group", 400);

    // Business rule: contribution must match the group's configured contribution amount
    const expected = Number(group.contributionAmount);
    if (Math.abs(input.amount - expected) > 0.009) {
      throw new ApiError(
        `Contribution amount must equal the group's contribution amount (${expected})`,
        422
      );
    }

    if (input.status === "PAID") {
      const completedPayoutsCount = await tx.payout.count({
        where: { groupId: input.groupId, status: "COMPLETED" }
      });
      const requiredPaidCountPerMember = completedPayoutsCount + 1;

      const memberPaidCount = await tx.contribution.count({
        where: { groupId: input.groupId, memberId: input.memberId, status: "PAID" }
      });

      if (memberPaidCount >= requiredPaidCountPerMember) {
        throw new ApiError("This member has already completed payment for the current cycle", 409);
      }
    }

    return tx.contribution.create({
      data: {
        groupId: input.groupId,
        memberId: input.memberId,
        amount: input.amount,
        status: input.status
      }
    });
  });

  await logAudit({
    actorId,
    action: "CONTRIBUTION_RECORDED",
    entityType: "Contribution",
    entityId: contribution.id,
    metadata: { groupId: input.groupId, memberId: input.memberId, amount: input.amount, status: input.status }
  });

  return contribution;
}

export async function listContributionsForGroup(groupId: string) {
  return prisma.contribution.findMany({
    where: { groupId },
    include: { member: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function listContributionsForMember(groupId: string, memberId: string) {
  return prisma.contribution.findMany({
    where: { groupId, memberId },
    orderBy: { createdAt: "desc" }
  });
}

export async function identifyDefaulters(groupId: string) {
  const missed = await prisma.contribution.findMany({
    where: { groupId, status: "MISSED" },
    include: { member: true },
    distinct: ["memberId"]
  });
  return missed.map((c) => ({ id: c.member.id, name: c.member.name, email: c.member.email }));
}
