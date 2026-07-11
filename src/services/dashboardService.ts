import { prisma } from "@/lib/prisma";

export async function getAdminDashboard(adminId: string) {
  const groups = await prisma.group.findMany({ where: { adminId }, include: { members: true } });
  const groupIds = groups.map((g) => g.id);

  const [totalContributions, pendingContributions, defaulterRows, nextPayouts] = await Promise.all([
    prisma.contribution.aggregate({
      where: { groupId: { in: groupIds }, status: "PAID" },
      _sum: { amount: true }
    }),
    prisma.contribution.count({
      where: { groupId: { in: groupIds }, status: { in: ["PENDING", "MISSED"] } }
    }),
    prisma.contribution.findMany({
      where: { groupId: { in: groupIds }, status: "MISSED" },
      include: { member: true, group: true },
      distinct: ["memberId"]
    }),
    prisma.payout.findMany({
      where: { groupId: { in: groupIds }, status: "PENDING" },
      include: { member: true, group: true },
      orderBy: { payoutOrder: "asc" }
    })
  ]);

  const nextPayoutByGroup = new Map<string, (typeof nextPayouts)[number]>();
  for (const p of nextPayouts) {
    if (!nextPayoutByGroup.has(p.groupId)) nextPayoutByGroup.set(p.groupId, p);
  }

  return {
    totalGroups: groups.length,
    totalMembers: groups.reduce((sum, g) => sum + g.members.length, 0),
    totalContributions: totalContributions._sum.amount ?? 0,
    pendingContributions,
    defaulters: defaulterRows.map((d) => ({
      id: d.member.id,
      name: d.member.name,
      groupName: d.group.name
    })),
    nextPayouts: Array.from(nextPayoutByGroup.values()).map((p) => ({
      groupId: p.groupId,
      groupName: p.group.name,
      memberName: p.member.name,
      payoutOrder: p.payoutOrder
    }))
  };
}
