import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { createProductSchema } from "@/lib/validation/vendor";
import { createProduct } from "@/services/vendorService";
import { prisma } from "@/lib/prisma";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createProductSchema.parse(body);
  const product = await createProduct(session.sub, input);
  return ok(product, 201);
});

export const GET = withErrorHandling(async () => {
  const session = await requireRole("VENDOR");

  async function attachKinds<T extends { id: string }>(products: T[]) {
    const packageRows = await prisma.$queryRaw<
      Array<{ packageProductId: string | null }>
    >`
      SELECT "packageProductId"
      FROM "ProductPackage"
      WHERE "vendorId" = ${session.sub}
        AND "packageProductId" IS NOT NULL
    `;

    const packageIds = new Set(
      packageRows
        .map((row) => row.packageProductId)
        .filter((id): id is string => Boolean(id)),
    );

    return products.map((product) => ({
      ...product,
      kind: packageIds.has(product.id) ? "PACKAGE" : "STANDARD",
    }));
  }

  try {
    const products = await prisma.product.findMany({
      where: { vendorId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        createdAt: true,
        imageUrl: true,
      },
    });

    return ok(await attachKinds(products));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingImageColumn =
      message.includes("imageUrl") && message.includes("does not exist");

    if (!missingImageColumn) {
      throw error;
    }

    const products = await prisma.product.findMany({
      where: { vendorId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        createdAt: true,
      },
    });

    const normalized = products.map((product) => ({
      ...product,
      imageUrl: null,
    }));

    return ok(await attachKinds(normalized));
  }
});
