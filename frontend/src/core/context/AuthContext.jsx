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

const clearLocalCache = () => {
  localStorage.removeItem("sessions_list");
  localStorage.removeItem("sessions_messages");
  localStorage.removeItem("pinned_messages");
  localStorage.removeItem("sessions_drafts");
  localStorage.removeItem("current_session_id");
};

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
      clearLocalCache();
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
    try {
      const data = await api.auth.login(email, password);
      clearLocalCache();
      updateAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      if (err.data) {
        err.requiresVerification = err.data.requiresVerification || false;
        err.email = err.data.email || email;
      }
      throw err;
    }
  }, [updateAccessToken]);

  // ── Register (does not log in — user must verify email first) ────────────────
  const register = useCallback(async (email, password, name) => {
    return await api.auth.register(email, password, name);
  }, []);

  // ── Verify Email OTP (does not log in — user must sign in manually next) ─────
  const verifyEmail = useCallback(async (email, code) => {
    return await api.auth.verifyEmail(email, code);
  }, []);

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async (email) => {
    return await api.auth.resendOtp(email);
  }, []);

  // ── Forgot Password ──────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    return await api.auth.forgotPassword(email);
  }, []);

  // ── Verify Reset Code ────────────────────────────────────────────────────────
  const verifyResetCode = useCallback(async (email, code) => {
    return await api.auth.verifyResetCode(email, code);
  }, []);

  // ── Reset Password ───────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email, code, newPassword) => {
    return await api.auth.resetPassword(email, code, newPassword);
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Even if network request fails, clear local state
    } finally {
      clearLocalCache();
      updateAccessToken(null);
      setUser(null);
      window.location.href = "/";
    }
  }, [updateAccessToken]);



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
    clearLocalCache();
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
