import Link from "next/link";

export default function NotFound() {
  return (
    <main className="editor-message">
      <span className="eyebrow">404</span>
      <h1>Document not found.</h1>
      <p>It may have been removed or you may not have access.</p>
      <Link className="back-link" href="/">Back to documents</Link>
    </main>
  );
}