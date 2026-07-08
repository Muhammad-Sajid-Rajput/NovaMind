// NovaMind — frontend/src/core/pages/NotFoundPage.jsx — Phase 1
// Shown on any unmatched route (catch-all *).

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center gap-6 bg-background text-text-primary px-4">
      {/* Large 404 */}
      <div className="text-8xl font-extrabold select-none"
        style={{ color: "var(--color-primary)" }}
      >
        404
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-text-muted text-sm max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link
        to="/chat"
        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        Go to NovaMind
      </Link>
    </div>
  );
}
