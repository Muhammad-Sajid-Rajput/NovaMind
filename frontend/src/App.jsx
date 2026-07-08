// NovaMind — frontend/src/App.jsx — Phase 1
// Root application shell with React Router route definitions.
// Auth guard via ProtectedRoute and AuthLayout components.

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChatProvider }  from "./features/chat/context/ChatContext.jsx";
import { AuthProvider, useAuth } from "./core/context/AuthContext.jsx";
import ErrorBoundary     from "./core/components/ErrorBoundary.jsx";
import ProtectedRoute    from "./core/components/ProtectedRoute.jsx";
import AuthLayout        from "./features/auth/components/AuthLayout.jsx";
import dayjs             from "dayjs";
import relativeTime      from "dayjs/plugin/relativeTime";

const AuthPage     = lazy(() => import("./features/auth/pages/AuthPage.jsx"));
const ChatPage     = lazy(() => import("./features/chat/pages/ChatPage.jsx"));
const NotFoundPage = lazy(() => import("./core/pages/NotFoundPage.jsx"));

dayjs.extend(relativeTime);

// ─── Full-screen loading spinner shown while silent refresh resolves ───────────
function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading NovaMind"
      className="min-h-screen w-screen flex flex-col items-center justify-center gap-4 bg-background"
    >
      <img
        src="/favicon.webp"
        alt="NovaMind"
        className="w-16 h-16 object-contain rounded-2xl"
      />
      <h1 className="text-xl font-bold text-text-primary">NovaMind</h1>
      <div
        className="w-6 h-6 rounded-full border-[3px] border-transparent motion-safe:animate-spin"
        style={{
          borderTopColor:    "var(--color-primary)",
          borderRightColor:  "var(--color-border)",
          borderBottomColor: "var(--color-border)",
          borderLeftColor:   "var(--color-border)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Route tree (inside AuthProvider so useAuth() works in children) ──────────
function AppRoutes() {
  const { isLoading } = useAuth();

  // Block route rendering until silent-refresh resolves
  if (isLoading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public auth routes — AuthLayout redirects logged-in users to /chat */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login"      element={<AuthPage />} />
          <Route path="/auth/register"   element={<AuthPage />} />
          <Route path="/auth/verify-otp" element={<AuthPage />} />
          <Route path="/auth/forgot"     element={<AuthPage />} />
          <Route path="/auth/reset"      element={<AuthPage />} />
        </Route>

        {/* Protected chat routes — require valid accessToken */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={<Navigate to="/new" replace />}
          />
          <Route
            path="/chat"
            element={<Navigate to="/new" replace />}
          />
          <Route
            path="/new"
            element={
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            }
          />
          <Route
            path="/chat/:sessionId"
            element={
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            }
          />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
