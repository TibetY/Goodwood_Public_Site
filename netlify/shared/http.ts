// Small response helpers so every ticketing function returns a consistent shape.

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface FnResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export function json(statusCode: number, payload: unknown, headers: Record<string, string> = {}): FnResponse {
  return {
    statusCode,
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(payload),
  };
}

export const ok = (payload: unknown) => json(200, payload);
export const badRequest = (error: string) => json(400, { error });
export const unauthorized = (error = 'Unauthorized') => json(401, { error });
export const forbidden = (error = 'Forbidden') => json(403, { error });
export const notFound = (error = 'Not found') => json(404, { error });
export const methodNotAllowed = () => json(405, { error: 'Method not allowed' });
export const serverError = (error = 'Internal server error') => json(500, { error });

/** Parse a JSON request body, returning null when it is absent or malformed. */
export function parseBody<T>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
