// NovaMind — frontend/src/core/context/AuthContext.jsx — Phase 1
// accessToken lives in React state (memory only — never localStorage).
// On mount: silent refresh call restores session from httpOnly cookie.
// On 401 broadcast: force-clears state and redirects to login.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { setAccessToken, api } from "../../config/api.js";


const AuthContext = createContext(null);
const BASE        = import.meta.env.VITE_API_URL || "/api";

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [accessToken, setToken]       = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  // Synchronous token update helper to avoid React state-batching race conditions
  const updateAccessToken = useCallback((token) => {
    setToken(token);
    setAccessToken(token);
    
    // Set a session presence hint so that we don't query /refresh when logged out
    if (token) {
      localStorage.setItem("novamind_logged_in", "true");
    } else {
      localStorage.removeItem("novamind_logged_in");
    }
  }, []);

  // ── Listen for force-logout broadcast from apiFetch interceptor ─────────────
  useEffect(() => {
    const handleForceLogout = () => {
      // Clear cached chat details to prevent leak
      localStorage.removeItem("sessions_list");
      localStorage.removeItem("sessions_messages");
      localStorage.removeItem("pinned_messages");
      localStorage.removeItem("sessions_drafts");
      localStorage.removeItem("current_session_id");

      updateAccessToken(null);
      setUser(null);
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, [updateAccessToken]);

  // ── Silent refresh on app mount — restores session from httpOnly cookie ──────
  useEffect(() => {
    const initAuth = async () => {
      // Check the session hint. If the user was logged out, skip calling /refresh 
      // to completely avoid printing 401 Unauthorized errors in the console.
      const isLoggedIn = localStorage.getItem("novamind_logged_in") === "true";
      
      if (!isLoggedIn) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method:      "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          updateAccessToken(data.accessToken);
          setUser(data.user);
        } else {
          // If server rejects refresh, clear the hint
          localStorage.removeItem("novamind_logged_in");
        }
      } catch {
        // Network error — stay logged out
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [updateAccessToken]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${BASE}/auth/login`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err                   = new Error(data.error || "Login failed");
      err.requiresVerification    = data.requiresVerification || false;
      err.email                   = data.email || email;
      throw err;
    }
    // Clear cached chat details to prevent leak
    localStorage.removeItem("sessions_list");
    localStorage.removeItem("sessions_messages");
    localStorage.removeItem("pinned_messages");
    localStorage.removeItem("sessions_drafts");
    localStorage.removeItem("current_session_id");

    updateAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  }, [updateAccessToken]);

  // ── Register (does not log in — user must verify email first) ────────────────
  const register = useCallback(async (email, password, name) => {
    const res  = await fetch(`${BASE}/auth/register`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data; // { message, email }
  }, []);

  // ── Verify Email OTP (does not log in — user must sign in manually next) ─────
  const verifyEmail = useCallback(async (email, code) => {
    const res  = await fetch(`${BASE}/auth/verify-email`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Verification failed");
    return data;
  }, []);

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async (email) => {
    const res  = await fetch(`${BASE}/auth/resend-otp`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to resend code");
    return data;
  }, []);

  // ── Forgot Password ──────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res  = await fetch(`${BASE}/auth/forgot-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to request reset code");
    return data;
  }, []);

  // ── Verify Reset Code ────────────────────────────────────────────────────────
  const verifyResetCode = useCallback(async (email, code) => {
    const res  = await fetch(`${BASE}/auth/verify-reset-code`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to verify reset code");
    return data;
  }, []);

  // ── Reset Password ───────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email, code, newPassword) => {
    const res  = await fetch(`${BASE}/auth/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset password");
    return data;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Ask server to clear the httpOnly refreshToken cookie
      await fetch(`${BASE}/auth/logout`, {
        method:      "POST",
        credentials: "include",
        headers:     accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {
      // Even if the request fails, clear local state
    } finally {
      // Clear cached chat details to prevent leak
      localStorage.removeItem("sessions_list");
      localStorage.removeItem("sessions_messages");
      localStorage.removeItem("pinned_messages");
      localStorage.removeItem("sessions_drafts");
      localStorage.removeItem("current_session_id");

      updateAccessToken(null);
      setUser(null);

      // Redirect to landing page — full navigation clears all in-memory state
      window.location.href = "/";
    }
  }, [accessToken, updateAccessToken]);



  // ── Change Password ─────────────────────────────────────────────────────────
  // Uses api.auth.changePassword so the fetchWithRefresh interceptor handles
  // expired access tokens automatically (silent retry after 401).
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await api.auth.changePassword(currentPassword, newPassword);
    return data;
  }, []);

  // ── Delete Account ─────────────────────────────────────────────────────
  // State is cleared AFTER the server confirms deletion to avoid logging the
  // user out locally if the network request fails.
  const deleteAccount = useCallback(async (password) => {
    await api.auth.deleteAccount(password);

    // Only clear local state after confirmed server deletion
    localStorage.removeItem("sessions_list");
    localStorage.removeItem("sessions_messages");
    localStorage.removeItem("pinned_messages");
    localStorage.removeItem("sessions_drafts");
    localStorage.removeItem("current_session_id");

    updateAccessToken(null);
    setUser(null);
  }, [updateAccessToken]);


  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        resendOtp,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        logout,
        deleteAccount,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
