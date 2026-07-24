// NovaMind — frontend/src/core/components/ProtectedRoute.jsx — Phase 1
// Renders children only if the user is authenticated.
// Unauthenticated users are redirected to /auth/login with the original
// destination saved in router state so they can be redirected back after login.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location            = useLocation();

  // isLoading is handled by AppRoutes before this renders — but guard anyway
  if (isLoading) return null;

  if (!user) {
    // Sanitize state.from location to prevent open redirect attacks
    const rawFrom = location.pathname + location.search + location.hash;
    const safeFrom = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? location : { pathname: "/" };

    return (
      <Navigate
        to="/auth/login"
        state={{ from: safeFrom }}
        replace
      />
    );
  }

  return <Outlet />;
}
