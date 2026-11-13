"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Access = "owner" | "editor" | "viewer";
type DocumentItem = {
  id: string;
  title: string;
  updatedAt: string;
  access: Access;
  sharedBy?: string;
};

function messageFrom(response: Response, body: { error?: { message?: string } }) {
  return body.error?.message ?? `Request failed (${response.status}).`;
}

export function Dashboard({ userName }: { userName: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = deleteDialog.current;
    if (deleteTarget && dialog && !dialog.open) dialog.showModal();
    if (!deleteTarget && dialog?.open) dialog.close();
  }, [deleteTarget]);

  async function loadDocuments() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setDocuments(body as DocumentItem[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function createDocument() {
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/documents", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      window.location.assign(`/documents/${body.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the document.");
      setCreating(false);
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/documents/import", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      window.location.assign(`/documents/${body.id}`);
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : "Unable to import this file.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deleteDocument(document: DocumentItem) {
    setDeletingId(document.id);
    setDeleteError("");
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(messageFrom(response, body));
      }
      setDocuments((items) => items.filter((item) => item.id !== document.id));
      setDeleteTarget(null);
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "Unable to delete this document.");
    } finally {
      setDeletingId("");
    }
  }

  const visibleDocuments = documents.filter((document) => tab === "mine"
    ? document.access === "owner"
    : document.access !== "owner");

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <Link className="wordmark" href="/">Fieldnotes<span>/</span></Link>
        <div className="header-account">
          <span>{userName}</span>
          <form action="/api/auth/logout" method="post"><button className="text-button" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow">Your workspace</span>
          <h1>Documents</h1>
        </div>
        <div className="dashboard-actions">
          <input ref={fileInput} className="visually-hidden" type="file" accept=".txt,.md,.docx" aria-label="Choose a .txt, .md, or .docx file" onChange={(event) => void importFile(event.currentTarget.files?.[0])} />
          <button className="secondary-button" onClick={() => fileInput.current?.click()} disabled={importing}>
            {importing ? "Importing..." : "Import"}
          </button>
          <button className="primary-button" onClick={createDocument} disabled={creating}>
            {creating ? "Creating..." : "+ New document"}
          </button>
        </div>
      </section>
      <p className="import-help">Supported: .txt, .md, .docx (max 2 MB). Images and complex Word layouts are not imported.</p>
      <nav className="tabs" aria-label="Document views">
        <button className={tab === "mine" ? "tab active" : "tab"} onClick={() => setTab("mine")} aria-pressed={tab === "mine"}>My documents</button>
        <button className={tab === "shared" ? "tab active" : "tab"} onClick={() => setTab("shared")} aria-pressed={tab === "shared"}>Shared with me</button>
      </nav>
      {error && (
        <div className="notice error-notice" role="alert">
          <span>{error}</span><button className="text-button" onClick={() => void loadDocuments()}>Retry</button>
        </div>
      )}
      {importError && <p className="import-error" role="alert">{importError}</p>}
      {loading ? <div className="skeleton-grid" aria-label="Loading documents" aria-busy="true"><div className="skeleton-card" /><div className="skeleton-card" /></div> : visibleDocuments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">—</span>
          <h2>{tab === "mine" ? "No documents yet" : "Nothing shared with you"}</h2>
          <p>{tab === "mine" ? "Create a document to get started." : "Documents shared with you will appear here."}</p>
        </div>
      ) : (
        <div className="document-list">
          {visibleDocuments.map((document) => (
            <article className="document-row" key={document.id}>
              <Link className="document-card-link" href={`/documents/${document.id}`}>
                <span className="document-icon" aria-hidden="true">▤</span>
                <span className="document-main">
                  <strong>{document.title}</strong>
                  <span>{document.access === "owner" ? "Updated" : `Shared by ${document.sharedBy}`} · {new Date(document.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
                <span className={`access-badge ${document.access}`}>{document.access[0].toUpperCase() + document.access.slice(1)}</span>
                <span className="row-arrow" aria-hidden="true">↗</span>
              </Link>
              {document.access === "owner" && (
                <button className="delete-document-button" type="button" aria-label={`Delete ${document.title}`} disabled={Boolean(deletingId)} onClick={() => { setDeleteError(""); setDeleteTarget(document); }}>
                  Delete
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <dialog
        ref={deleteDialog}
        className="delete-dialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        onCancel={(event) => { event.preventDefault(); if (!deletingId) setDeleteTarget(null); }}
        onClick={(event) => { if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null); }}
      >
        {deleteTarget && (
          <>
            <span className="eyebrow">Delete document</span>
            <h2 id="delete-dialog-title">Delete “{deleteTarget.title}”?</h2>
            <p id="delete-dialog-description">This permanently deletes the document and removes collaborator access. This action cannot be undone.</p>
            {deleteError && <p className="delete-dialog-error" role="alert">{deleteError}</p>}
            <div className="delete-dialog-actions">
              <button className="dialog-cancel-button" type="button" disabled={Boolean(deletingId)} autoFocus onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="dialog-delete-button" type="button" disabled={Boolean(deletingId)} onClick={() => void deleteDocument(deleteTarget)}>
                {deletingId ? "Deleting..." : "Delete document"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}