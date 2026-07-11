export type Role = "ADMIN" | "MEMBER" | "VENDOR" | "CUSTOMER";

export interface SessionUser {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string; details?: unknown };
}
