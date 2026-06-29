import { NextResponse } from "next/server";
import { logger } from "./logger";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(message = "Not found") {
  return err(message, 404);
}

export function badRequest(message: string) {
  return err(message, 400);
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401);
}

export async function safeJson(req: Request): Promise<{ data: any; error: Response | null }> {
  try {
    const data = await req.json();
    return { data, error: null };
  } catch {
    return { data: null, error: badRequest("Invalid JSON body") };
  }
}

export async function safeParse<T>(
  req: Request,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
): Promise<{ data: T; error: Response | null }> {
  const { data: body, error: jsonError } = await safeJson(req);
  if (jsonError) return { data: null as any, error: jsonError };

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error?.flatten?.()?.fieldErrors;
    const message = fieldErrors
      ? Object.values(fieldErrors).flat().join(", ")
      : "Validation failed";
    return { data: null as any, error: badRequest(message) };
  }

  return { data: parsed.data as T, error: null };
}

export function handleError(error: unknown, context: string): Response {
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  logger.error(context, { error: message });
  return err(message);
}
