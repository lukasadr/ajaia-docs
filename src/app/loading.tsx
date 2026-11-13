export default function Loading() {
  return (
    <main className="dashboard-shell" aria-label="Loading dashboard" aria-busy="true">
      <div className="skeleton-bar" />
      <div className="skeleton-heading" />
      <div className="skeleton-tabs" />
      <div className="skeleton-grid">
        <div className="skeleton-card" /><div className="skeleton-card" />
      </div>
    </main>
  );
}