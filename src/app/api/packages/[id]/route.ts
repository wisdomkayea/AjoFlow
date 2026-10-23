import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const session = await requireRole("VENDOR");
    const packageId = ctx.params.id;

    const pkg = await prisma.productPackage.findFirst({
      where: { id: packageId, vendorId: session.sub },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, imageUrl: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!pkg) {
      return ok(null, 404);
    }

    const packageProduct = pkg.packageProductId
      ? await prisma.product.findUnique({
          where: { id: pkg.packageProductId },
          select: { id: true, name: true, price: true, imageUrl: true, createdAt: true },
        })
      : null;

    return ok({
      id: pkg.id,
      name: pkg.name,
      baseTotal: Number(pkg.baseTotal ?? 0),
      discountAmount: Number(pkg.discountAmount ?? 0),
      finalTotal: Number(pkg.finalTotal ?? 0),
      packageProductId: pkg.packageProductId,
      createdAt: pkg.createdAt.toISOString(),
      packageProduct,
      items: pkg.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.price ?? 0),
          imageUrl: item.product.imageUrl,
          createdAt: item.product.createdAt.toISOString(),
        },
      })),
    });
  },
);
