import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, signSession } from "@/lib/auth";
import { ApiError } from "@/lib/api-response";
import { SignupInput, LoginInput } from "@/lib/validation/auth";

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role
    }
  });

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  return { token, user: sanitize(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError("Invalid email or password", 401);
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new ApiError("Invalid email or password", 401);
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  return { token, user: sanitize(user) };
}

function sanitize(user: { id: string; name: string; email: string; role: string; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}
