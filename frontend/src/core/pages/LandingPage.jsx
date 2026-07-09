// NovaMind — LandingPage.jsx
// Public entry point for new users. Shows hero, feature cards, and nav.
// Authenticated users see an "Enter Workspace" CTA; guests see Sign In / Sign Up.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Icon } from "@iconify/react";

export default function LandingPage() {
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;

  // The global #root and body have overflow:hidden for the chat layout.
  // Override them only while the landing page is mounted.
  useEffect(() => {
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, root: root?.style.overflow };
    document.body.style.overflow = "auto";
    document.body.style.overflowX = "hidden";
    if (root) { root.style.overflow = "auto"; root.style.overflowX = "hidden"; }
    return () => {
      document.body.style.overflow = prev.body;
      document.body.style.overflowX = "";
      if (root) { root.style.overflow = prev.root; root.style.overflowX = ""; }
    };
  }, []);

  const features = [
    {
      icon: "mdi:brain",
      title: "Contextual AI Memory",
      description:
        "NovaMind dynamically learns and references facts, context, and preferences about you over time to build a hyper-personalized persona.",
    },
    {
      icon: "mdi:file-document-multiple-outline",
      title: "Deep RAG Integrations",
      description:
        "Upload PDFs, Word docs, Excel spreadsheets, or PowerPoints and talk to them with smart, round-robin chunk-diversified context.",
    },
    {
      icon: "mdi:key-variant",
      title: "Multi-Key Rotation",
      description:
        "Bypasses rate limits by rotating requests across up to three Gemini API keys in a seamless round-robin fallback cycle.",
    },
    {
      icon: "mdi:web",
      title: "Real-Time Web Grounding",
      description:
        "Uses optimized search queries to ground chat answers with live, up-to-date facts from the web via Tavily.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans relative flex flex-col overflow-x-hidden">
      {/* ── Decorative glow orbs ── */}
      <div className="pointer-events-none absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-[15%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/5 blur-[130px]" />

      {/* ──────────── HEADER ──────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
              src="/favicon.webp"
              alt="NovaMind"
              className="w-9 h-9 rounded-full object-cover shadow-lg shadow-primary/20 shrink-0"
            />
          <span className="font-display text-lg font-bold tracking-tight">
            NovaMind
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="hidden sm:inline text-xs text-text-secondary">
                Welcome back,{" "}
                <strong className="text-text-primary">{user.name}</strong>
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-all"
              >
                <Icon icon="mdi:logout" className="text-base" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:text-text-primary transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ──────────── HERO ──────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center w-full max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-8 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <Icon icon="mdi:lightning-bolt" className="text-sm" />
          NovaMind Platform — Live
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight leading-[1.1] mb-6 max-w-3xl">
          Your Personalized
          <span className="block mt-2 bg-gradient-to-r from-primary via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            AI Chat Workspace
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-text-secondary text-base sm:text-lg leading-relaxed mb-10 max-w-2xl">
          NovaMind is an enterprise-ready AI assistant that automatically
          remembers context and facts about you across conversations, while
          delivering multi-key Gemini execution and deep document RAG search.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto">
          {isLoggedIn ? (
            <Link
              to="/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Enter Chat Workspace
              <Icon icon="mdi:arrow-right" className="text-lg" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Create Account
                <Icon icon="mdi:arrow-right" className="text-lg" />
              </Link>
              <Link
                to="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-border bg-surface/40 hover:bg-surface-hover text-text-primary font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Sign In to Continue
              </Link>
            </>
          )}
        </div>

        {/* ──────────── FEATURE GRID ──────────── */}
        <div className="w-full mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="group p-6 rounded-2xl border border-border bg-surface/30 hover:bg-surface/60 hover:border-primary/25 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-11 h-11 mb-5 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300">
                <Icon icon={feat.icon} className="text-2xl" />
              </div>

              <h3 className="font-display font-semibold text-base text-text-primary mb-2 group-hover:text-white transition-colors">
                {feat.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-7 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-secondary">
        <span>
          &copy; {new Date().getFullYear()} NovaMind AI. All rights reserved.
        </span>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            All systems operational
          </span>
          <a
            href="https://github.com/Muhammad-Sajid-Rajput/NovaMind"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-text-primary transition-colors"
          >
            <Icon icon="mdi:github" className="text-base" />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
