import { ClientApiError } from "@/lib/api-client";

export interface ResolvedError {
  message: string;
  isMinor: boolean;
}

export function resolveError(error: unknown, fallback: string): ResolvedError {
  if (error instanceof ClientApiError) {
    return {
      message: error.message || fallback,
      isMinor: error.status >= 400 && error.status < 500
    };
  }

  return {
    message: fallback,
    isMinor: false
  };
}
