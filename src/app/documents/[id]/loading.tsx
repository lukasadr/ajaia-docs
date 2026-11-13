export default function LoadingDocument() {
  return (
    <main className="editor-shell" aria-label="Loading document" aria-busy="true">
      <div className="skeleton-bar" />
      <div className="skeleton-editor-title" />
      <div className="skeleton-toolbar" />
      <div className="skeleton-paper" />
    </main>
  );
}