import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status },
  );
}

/**
 * Wraps a route handler, converting thrown ApiError / ZodError / unknown errors
 * into consistent JSON error responses instead of leaking stack traces.
 */
export function withErrorHandling(
  handler: (req: Request, ctx: any) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err: any) {
      if (err instanceof ApiError) {
        return fail(err.message, err.status, err.details);
      }
      if (err?.name === "ZodError") {
        return fail("Validation failed", 422, err.issues ?? err.errors);
      }

      if (err?.name === "PrismaClientInitializationError") {
        console.error("[db_connection_error]", err);
        return fail(
          "Database connection unavailable. Please verify DATABASE_URL/DIRECT_URL and try again.",
          503,
        );
      }

      if (err?.code === "P2021" || err?.code === "P2022") {
        console.error("[db_schema_error]", err);
        return fail(
          "Database schema is out of sync. Run Prisma migrations and try again.",
          500,
        );
      }

      console.error("[api_error]", err);
      return fail("Internal server error", 500);
    }
  };
}
