"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
        <button className="primary-button" onClick={createDocument} disabled={creating}>
          {creating ? "Creating..." : "+ New document"}
        </button>
      </section>
      <nav className="tabs" aria-label="Document views">
        <button className={tab === "mine" ? "tab active" : "tab"} onClick={() => setTab("mine")} aria-pressed={tab === "mine"}>My documents</button>
        <button className={tab === "shared" ? "tab active" : "tab"} onClick={() => setTab("shared")} aria-pressed={tab === "shared"}>Shared with me</button>
      </nav>
      {error && (
        <div className="notice error-notice" role="alert">
          <span>{error}</span><button className="text-button" onClick={() => void loadDocuments()}>Retry</button>
        </div>
      )}
      {loading ? <p className="loading-state">Loading documents...</p> : visibleDocuments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">—</span>
          <h2>{tab === "mine" ? "No documents yet" : "Nothing shared with you"}</h2>
          <p>{tab === "mine" ? "Create a document to get started." : "Documents shared with you will appear here."}</p>
        </div>
      ) : (
        <div className="document-list">
          {visibleDocuments.map((document) => (
            <Link className="document-row" href={`/documents/${document.id}`} key={document.id}>
              <span className="document-icon" aria-hidden="true">▤</span>
              <span className="document-main">
                <strong>{document.title}</strong>
                <span>{document.access === "owner" ? "Updated" : `Shared by ${document.sharedBy}`} · {new Date(document.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              </span>
              <span className={`access-badge ${document.access}`}>{document.access[0].toUpperCase() + document.access.slice(1)}</span>
              <span className="row-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}