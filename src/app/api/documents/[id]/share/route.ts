import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson } from "@/lib/api";
import { getAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listShares, shareDocument, ShareServiceError, shareRoleSchema, unshareDocument } from "@/lib/sharing";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.string().cuid();
const shareSchema = z.object({ email: z.string().trim().email(), role: shareRoleSchema });
const unshareSchema = z.object({ userId: z.string().min(1) });

async function authorizeOwner(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
  if (!document) return { response: apiError(404, "NOT_FOUND", "Document not found.") };
  const access = getAccess({ id: userId }, document);
  if (access === "none") return { response: apiError(404, "NOT_FOUND", "Document not found.") };
  if (access !== "owner") return { response: apiError(403, "FORBIDDEN", "Only the owner can manage sharing.") };
  return { response: null };
}

function serviceError(error: unknown) {
  if (!(error instanceof ShareServiceError)) throw error;
  const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 400;
  return apiError(status, error.code, error.message);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  const authorization = await authorizeOwner(parsedId.data, user.id);
  if (authorization.response) return authorization.response;

  try {
    return NextResponse.json(await listShares(user.id, parsedId.data));
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  const authorization = await authorizeOwner(parsedId.data, user.id);
  if (authorization.response) return authorization.response;
  const parsed = await parseJson(request, shareSchema);
  if (!parsed.success) return parsed.response;

  try {
    return NextResponse.json(await shareDocument(user.id, parsedId.data, parsed.data.email, parsed.data.role));
  } catch (error) {
    return serviceError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  const authorization = await authorizeOwner(parsedId.data, user.id);
  if (authorization.response) return authorization.response;
  const parsed = await parseJson(request, unshareSchema);
  if (!parsed.success) return parsed.response;

  try {
    await unshareDocument(user.id, parsedId.data, parsed.data.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serviceError(error);
  }
}