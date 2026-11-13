"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

type Access = "owner" | "editor" | "viewer";
type DocumentData = { id: string; title: string; content: object; access: Access };
type SaveState = "saved" | "saving" | "error";
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function errorText(response: Response, body: { error?: { message?: string } }) {
  return body.error?.message ?? `Request failed (${response.status}).`;
}

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pendingContent, setPendingContent] = useState<object | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const latestContent = useRef<object | null>(null);
  const editable = document?.access !== "viewer";

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline],
    content: EMPTY_DOC,
    immediatelyRender: false,
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      const content = currentEditor.getJSON();
      latestContent.current = content;
      setPendingContent(content);
      setSaveState("saving");
    },
  });

  const loadDocument = useCallback(async () => {
    setLoadError("");
    try {
      const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(errorText(response, body));
      const nextDocument = body as DocumentData;
      setDocument(nextDocument);
      setTitle(nextDocument.title);
      editor?.commands.setContent(nextDocument.content);
      setSaveState("saved");
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load document.");
    }
  }, [documentId, editor]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!pendingContent || !document || !editable) return;
    const snapshot = pendingContent;
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/documents/${document.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: snapshot }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(errorText(response, body));
        if (JSON.stringify(latestContent.current) === JSON.stringify(snapshot)) {
          setPendingContent(null);
          setSaveState("saved");
        }
      } catch {
        setSaveState("error");
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [document, editable, pendingContent, retryCount]);

  async function saveTitle() {
    const nextTitle = title.trim() || "Untitled document";
    setTitle(nextTitle);
    if (!document || nextTitle === document.title || !editable) return;
    setTitleError("");
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorText(response, body));
      setDocument(body as DocumentData);
    } catch (reason) {
      setTitleError(reason instanceof Error ? reason.message : "Title could not be saved.");
    }
  }

  if (loadError) return (
    <main className="editor-message"><p role="alert">{loadError}</p><button className="primary-button" onClick={() => void loadDocument()}>Retry</button><Link href="/">Back to documents</Link></main>
  );
  if (!document || !editor) return <main className="editor-message">Loading document...</main>;

  const toolbarButton = (label: string, active: boolean, action: () => void, key?: string | number) => (
    <button key={key} className={active ? "tool-button active" : "tool-button"} type="button" aria-label={label} aria-pressed={active} disabled={!editable} onClick={action}>{label}</button>
  );

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <Link className="back-link" href="/" aria-label="Back to documents">← <span>Documents</span></Link>
        <div className="save-indicator" aria-live="polite">
          {saveState === "saving" ? "Saving..." : saveState === "error" ? <><span>Error saving</span><button className="text-button" onClick={() => setRetryCount((count) => count + 1)}>Retry</button></> : "Saved"}
        </div>
      </header>
      <section className="editor-heading">
        <input aria-label="Document title" className="title-input" value={title} readOnly={!editable} onChange={(event) => setTitle(event.target.value)} onBlur={() => void saveTitle()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <span className={`access-badge ${document.access}`}>{document.access[0].toUpperCase() + document.access.slice(1)}</span>
        {titleError && <p className="title-error" role="alert">{titleError}</p>}
      </section>
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
        {toolbarButton("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
        {toolbarButton("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
        {toolbarButton("U", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run())}
        <span className="toolbar-divider" />
        {toolbarButton("¶", editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run())}
        {[1, 2, 3].map((level) => toolbarButton(`H${level}`, editor.isActive("heading", { level }), () => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(), level))}
        <span className="toolbar-divider" />
        {toolbarButton("• List", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
        {toolbarButton("1. List", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
      </div>
      <section className="paper" aria-label="Document content">
        {!editable && <p className="readonly-note">Read-only access</p>}
        <EditorContent editor={editor} />
      </section>
    </main>
  );
}