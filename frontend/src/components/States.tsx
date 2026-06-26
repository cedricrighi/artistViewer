import type { ReactNode } from "react";

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

/** Simple shimmer block used as a loading placeholder for cards/tables. */
export function Skeleton({ height = 180 }: { height?: number }) {
  return <div className="skeleton-block" style={{ height }} aria-hidden="true" />;
}
