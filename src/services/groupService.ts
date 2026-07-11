import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { CreateGroupInput, AddMemberInput } from "@/lib/validation/group";
import { logAudit } from "./auditService";

export async function createGroup(adminId: string, input: CreateGroupInput) {
  const group = await prisma.group.create({
    data: {
      name: input.name,
      contributionAmount: input.contributionAmount,
      frequency: input.frequency,
      startDate: input.startDate,
      totalMembers: input.totalMembers,
      adminId
    }
  });

  await logAudit({
    actorId: adminId,
    action: "GROUP_CREATED",
    entityType: "Group",
    entityId: group.id,
    metadata: { name: group.name, totalMembers: group.totalMembers }
  });

  return group;
}

async function assertIsGroupAdmin(groupId: string, adminId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError("Group not found", 404);
  if (group.adminId !== adminId) {
    throw new ApiError("Only the group admin can perform this action", 403);
  }
  return group;
}

export async function addMember(groupId: string, adminId: string, input: AddMemberInput) {
  const group = await assertIsGroupAdmin(groupId, adminId);

  const currentCount = await prisma.groupMember.count({ where: { groupId } });
  if (currentCount >= group.totalMembers) {
    throw new ApiError("Group has already reached its total member capacity", 400);
  }

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: input.userId, groupId } }
  });
  if (alreadyMember) {
    throw new ApiError("User is already a member of this group", 409);
  }

  // Auto-generate payout order when not explicitly provided (next available slot)
  let payoutOrder = input.payoutOrder;
  if (!payoutOrder) {
    const last = await prisma.groupMember.findFirst({
      where: { groupId },
      orderBy: { payoutOrder: "desc" }
    });
    payoutOrder = (last?.payoutOrder ?? 0) + 1;
  } else {
    const clash = await prisma.groupMember.findFirst({ where: { groupId, payoutOrder } });
    if (clash) throw new ApiError(`Payout order ${payoutOrder} is already assigned`, 409);
  }

  const member = await prisma.groupMember.create({
    data: { groupId, userId: input.userId, payoutOrder }
  });

  await logAudit({
    actorId: adminId,
    action: "MEMBER_ADDED",
    entityType: "Group",
    entityId: groupId,
    metadata: { userId: input.userId, payoutOrder }
  });

  return member;
}

export async function removeMember(groupId: string, adminId: string, userId: string) {
  await assertIsGroupAdmin(groupId, adminId);

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId, groupId } }
  });

  await logAudit({
    actorId: adminId,
    action: "MEMBER_REMOVED",
    entityType: "Group",
    entityId: groupId,
    metadata: { userId }
  });
}

export async function getGroupDetails(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true }, orderBy: { payoutOrder: "asc" } },
      admin: true
    }
  });
  if (!group) throw new ApiError("Group not found", 404);
  return group;
}

export async function getGroupSummary(groupId: string) {
  const [group, totalContributions, pendingContributions, defaulters, nextPayout] =
    await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, include: { members: true } }),
      prisma.contribution.aggregate({
        where: { groupId, status: "PAID" },
        _sum: { amount: true },
        _count: true
      }),
      prisma.contribution.count({ where: { groupId, status: { in: ["PENDING", "MISSED"] } } }),
      prisma.contribution.findMany({
        where: { groupId, status: "MISSED" },
        include: { member: true },
        distinct: ["memberId"]
      }),
      prisma.payout.findFirst({
        where: { groupId, status: "PENDING" },
        orderBy: { payoutOrder: "asc" },
        include: { member: true }
      })
    ]);

  if (!group) throw new ApiError("Group not found", 404);

  return {
    groupId,
    name: group.name,
    totalMembers: group.members.length,
    totalContributions: totalContributions._sum.amount ?? 0,
    contributionsRecorded: totalContributions._count,
    pendingContributions,
    defaulters: defaulters.map((d) => ({ id: d.member.id, name: d.member.name })),
    nextPayout: nextPayout
      ? { memberId: nextPayout.memberId, memberName: nextPayout.member.name, payoutOrder: nextPayout.payoutOrder }
      : null
  };
}

export async function listGroupsForUser(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.group.findMany({ where: { adminId: userId }, orderBy: { createdAt: "desc" } });
  }
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: true }
  });
  return memberships.map((m) => m.group);
}
