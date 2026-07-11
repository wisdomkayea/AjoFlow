export class ClientApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include"
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    throw new ClientApiError(json?.error?.message ?? "Something went wrong", res.status);
  }

  return json.data as T;
}
