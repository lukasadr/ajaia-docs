"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "viewer" | "editor";
type Collaborator = { userId: string; role: Role; user: { name: string; email: string } };

function responseMessage(body: { error?: { message?: string } }, fallback: string) {
  return body.error?.message ?? fallback;
}

export function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState("");
  const [error, setError] = useState("");

  const loadCollaborators = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "Unable to load collaborators."));
      setCollaborators(body as Collaborator[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load collaborators.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  async function updateRole(targetEmail: string, nextRole: Role) {
    setBusyUser(targetEmail);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, role: nextRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "Unable to update access."));
      await loadCollaborators();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update access.");
    } finally {
      setBusyUser("");
    }
  }

  async function removeCollaborator(userId: string) {
    setBusyUser(userId);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(responseMessage(body ?? {}, "Unable to remove access."));
      setCollaborators((items) => items.filter((item) => item.userId !== userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove access.");
    } finally {
      setBusyUser("");
    }
  }

  async function addCollaborator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyUser("add");
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "Unable to share document."));
      setEmail("");
      await loadCollaborators();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to share document.");
    } finally {
      setBusyUser("");
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header className="share-dialog-header">
          <div><span className="eyebrow">Document access</span><h2 id="share-title">Share document</h2></div>
          <button className="icon-button" type="button" aria-label="Close sharing dialog" onClick={onClose}>×</button>
        </header>
        <form className="share-form" onSubmit={addCollaborator}>
          <label htmlFor="share-email">Email address</label>
          <div className="share-form-row">
            <input id="share-email" type="email" autoComplete="off" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <select aria-label="New collaborator role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="viewer">Viewer</option><option value="editor">Editor</option>
            </select>
            <button type="submit" disabled={busyUser === "add"}>{busyUser === "add" ? "Adding..." : "Add"}</button>
          </div>
        </form>
        {error && <p className="share-error" role="alert">{error}</p>}
        <div className="collaborator-section">
          <h3>People with access</h3>
          {loading ? <p className="dialog-muted">Loading collaborators...</p> : collaborators.length === 0 ? (
            <p className="dialog-muted">Only you have access to this document.</p>
          ) : collaborators.map((collaborator) => (
            <div className="collaborator-row" key={collaborator.userId}>
              <div className="collaborator-identity"><strong>{collaborator.user.name}</strong><span>{collaborator.user.email}</span></div>
              <select aria-label={`Role for ${collaborator.user.name}`} value={collaborator.role} disabled={busyUser === collaborator.user.email} onChange={(event) => void updateRole(collaborator.user.email, event.target.value as Role)}>
                <option value="viewer">Viewer</option><option value="editor">Editor</option>
              </select>
              <button className="remove-button" type="button" aria-label={`Remove ${collaborator.user.name}`} disabled={busyUser === collaborator.userId} onClick={() => void removeCollaborator(collaborator.userId)}>Remove</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}