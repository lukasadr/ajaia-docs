"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="editor-message" role="alert">
      <span className="eyebrow">Something went wrong</span>
      <h1>We could not load this page.</h1>
      <button className="primary-button" onClick={() => reset()}>Try again</button>
      <Link className="text-button" href="/">Back to documents</Link>
    </main>
  );
}