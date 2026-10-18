import { withErrorHandling, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Lightweight directory lookup used when adding group members or assigning installments. */
export const GET = withErrorHandling(async (req: Request) => {
  await requireSession();
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const users = await prisma.user.findMany({
    where: {
      role: role ? (role as any) : undefined,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true },
    take: 200,
  });

  return ok(users);
});
