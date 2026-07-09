// NovaMind — frontend/src/main.jsx — Phase 1
// Wraps the app in BrowserRouter for React Router v6 route matching.

import { StrictMode }  from "react";
import { createRoot }  from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// Unregister stale service workers in development to prevent PWA hijacking on localhost:5173
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    let unregistered = false;
    for (const registration of registrations) {
      registration.unregister();
      unregistered = true;
    }
    if (unregistered) {
      console.log("[PWA] Stale service worker unregistered in development mode. Reloading...");
      window.location.reload();
    }
  });
}

// Global PWA deferred prompt listener to enable custom installation button in Settings
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    window.dispatchEvent(new CustomEvent("pwa:installable"));
  });
  window.addEventListener("appinstalled", () => {
    window.deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa:installed"));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);