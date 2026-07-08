// NovaMind — frontend/src/features/auth/components/AuthLayout.jsx — Phase 1
// Wrapper for all /auth/* pages.
// Redirects already-authenticated users to /chat so they never see the login screen.

import { Navigate, Outlet } from "react-router-dom";
import { useAuth }          from "../../../core/context/AuthContext.jsx";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // isLoading is handled at AppRoutes level — but guard anyway
  if (isLoading) return null;

  // Already logged in — send to chat
  if (user) return <Navigate to="/chat" replace />;

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background p-4">
      <Outlet />
    </div>
  );
}
