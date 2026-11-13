import { NextResponse } from "next/server";
import { basename, extname } from "node:path";
import { z } from "zod";
import { getAccess } from "@/lib/access";
import { apiError } from "@/lib/api";
import { createDocument } from "@/lib/documents";
import { convertFile, ImportError, MAX_IMPORT_BYTES } from "@/lib/import/convert";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const filenameSchema = z.string().trim().min(1).max(255);
const extensionSchema = z.enum([".txt", ".md", ".docx"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(400, "INVALID_FORM_DATA", "Send a multipart form with a file field.");
  }

  const entry = formData.get("file");
  if (!(entry instanceof File)) return apiError(400, "MISSING_FILE", "Choose a file to import.");
  const filename = filenameSchema.safeParse(entry.name);
  if (!filename.success) return apiError(400, "INVALID_FILENAME", "The file must have a valid filename.");
  if (entry.size > MAX_IMPORT_BYTES) return apiError(413, "FILE_TOO_LARGE", "File must be 2 MB or smaller.");
  if (entry.size === 0) return apiError(400, "EMPTY_FILE", "The selected file is empty.");

  const extension = extensionSchema.safeParse(extname(filename.data).toLowerCase());
  if (!extension.success) {
    return apiError(400, "INVALID_FILE_TYPE", "Choose a .txt, .md, or .docx file.");
  }

  try {
    const content = await convertFile(filename.data, Buffer.from(await entry.arrayBuffer()));
    const title = basename(filename.data, extname(filename.data)).trim();
    const document = await createDocument(user.id, title || "Untitled document", content);
    const access = getAccess(user, document);
    if (access !== "owner") return apiError(500, "CREATE_FAILED", "The imported document could not be created.");
    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ImportError) return apiError(error.status, error.code, error.message);
    return apiError(400, "IMPORT_FAILED", "The file could not be imported.");
  }
}