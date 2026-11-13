import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import MarkdownIt from "markdown-it";
import mammoth from "mammoth";
import { EDITOR_EXTENSIONS } from "@/lib/editor-extensions";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });

export class ImportError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "ImportError";
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function textToHtml(text: string) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

export async function convertFile(filename: string, buffer: Buffer): Promise<JSONContent> {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || ![".txt", ".md", ".docx"].includes(extension)) {
    throw new ImportError("INVALID_FILE_TYPE", 400, "Choose a .txt, .md, or .docx file.");
  }
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportError("FILE_TOO_LARGE", 413, "File must be 2 MB or smaller.");
  }
  if (buffer.byteLength === 0) {
    throw new ImportError("EMPTY_FILE", 400, "The selected file is empty.");
  }

  let html: string;
  if (extension === ".txt") {
    html = textToHtml(buffer.toString("utf8"));
  } else if (extension === ".md") {
    html = markdown.render(buffer.toString("utf8"));
  } else {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new ImportError("INVALID_DOCX", 400, "This .docx file is not a valid ZIP-based Word document.");
    }
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
    } catch {
      throw new ImportError("INVALID_DOCX", 400, "The .docx file could not be read.");
    }
  }

  return generateJSON(html, EDITOR_EXTENSIONS);
}