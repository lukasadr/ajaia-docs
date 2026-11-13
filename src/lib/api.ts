import { NextResponse } from "next/server";
import { z } from "zod";

export const MAX_CONTENT_BYTES = 1024 * 1024;

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CONTENT_BYTES) {
    return { success: false as const, response: apiError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 1 MB.") };
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_CONTENT_BYTES) {
    return { success: false as const, response: apiError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 1 MB.") };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { success: false as const, response: apiError(400, "INVALID_JSON", "Request body must be valid JSON.") };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { success: false as const, response: apiError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body.") };
  }
  return { success: true as const, data: parsed.data as z.infer<T> };
}