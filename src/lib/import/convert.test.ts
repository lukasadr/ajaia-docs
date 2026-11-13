import { readFile } from "node:fs/promises";
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { convertFile, ImportError, MAX_IMPORT_BYTES } from "@/lib/import/convert";

const sample = (name: string) => readFile(new URL(`../../../samples/${name}`, import.meta.url));

describe("convertFile", () => {
  it("converts text blank-line-separated paragraphs and preserves inline line breaks", async () => {
    const json = await convertFile("sample.txt", await sample("sample.txt"));
    expect(json.content).toHaveLength(2);
    expect(json.content?.map((node: JSONContent) => node.type)).toEqual(["paragraph", "paragraph"]);
    expect(json.content?.[0]?.content?.map((node: JSONContent) => node.type)).toEqual(["text", "hardBreak", "text"]);
  });

  it("converts Markdown headings, bold marks, and bullet lists", async () => {
    const json = await convertFile("sample.md", await sample("sample.md"));
    expect(json.content?.map((node: JSONContent) => node.type)).toEqual(["heading", "paragraph", "bulletList"]);
    const boldRun = json.content?.[1]?.content?.find((node: JSONContent) => node.marks?.some((mark) => mark.type === "bold"));
    expect(boldRun).toBeDefined();
  });

  it("rejects unsupported extensions", async () => {
    await expect(convertFile("sample.rtf", Buffer.from("text")))
      .rejects.toMatchObject<Partial<ImportError>>({ code: "INVALID_FILE_TYPE", status: 400 });
  });

  it("rejects files larger than 2 MB", async () => {
    await expect(convertFile("large.txt", Buffer.alloc(MAX_IMPORT_BYTES + 1, 0x61)))
      .rejects.toMatchObject<Partial<ImportError>>({ code: "FILE_TOO_LARGE", status: 413 });
  });

  it("converts a small DOCX fixture into non-empty Tiptap content", async () => {
    const json = await convertFile("sample.docx", await sample("sample.docx"));
    expect(json.content?.length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).toContain("DOCX sample paragraph");
  });
});