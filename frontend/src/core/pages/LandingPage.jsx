// NovaMind — LandingPage.jsx
// Public entry point for new users. Shows hero, feature grid, and nav.
// Authenticated users see an "Enter Workspace" CTA; guests see Sign In / Sign Up.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Icon } from "@iconify/react";
import ConfirmationModal from "../components/ui/ConfirmationModal.jsx";

export default function LandingPage() {
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Same feature content as before — only presentation/placement changes.
  const features = [
    {
      icon: "mdi:brain",
      title: "Contextual AI Memory",
      description:
        "NovaMind dynamically learns and references facts, context, and preferences about you over time to build a hyper-personalized persona.",
    },
    {
      icon: "mdi:web",
      title: "Real-Time Web Grounding",
      description:
        "Uses optimized search queries to ground chat answers with live, up-to-date facts from the web via Tavily.",
    },
    {
      icon: "mdi:key-variant",
      title: "Multi-Key Rotation",
      description:
        "Bypasses rate limits by rotating requests across up to three Gemini API keys in a seamless round-robin fallback cycle.",
    },
    {
      icon: "mdi:file-document-multiple-outline",
      title: "Deep RAG Integrations",
      description:
        "Upload PDFs, Word docs, Excel spreadsheets, or PowerPoints and talk to them with smart, round-robin chunk-diversified context.",
    },
  ];

  // Fictional example only — never surface the signed-in user's real memory here.
  const memoryPreview = [
    { q: "Who am I talking to?", a: "You're Alex — a product designer who prefers dark mode and concise replies." },
  ];
  const memoryChips = ["Role: Product Designer", "Theme: Dark mode", "Tone: Concise"];

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans relative flex flex-col overflow-x-hidden">
      {/* Skip link — keyboard users can bypass the sticky header/nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-white focus:text-xs focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* ── Decorative glow orbs (z-0, purely ambient) ── */}
      <div className="pointer-events-none absolute z-0 -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[130px]" />
      <div className="pointer-events-none absolute z-0 -bottom-[15%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/5 blur-[130px]" />

      {/* ──────────── HEADER ──────────── */}
      <header className="sticky top-0 z-20 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

          <nav className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-error/25 bg-error/5 text-error hover:bg-error/10 hover:text-red-400 cursor-pointer transition-all duration-200 motion-reduce:transition-none shadow-sm shadow-error/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
              >
                <Icon icon="mdi:logout" className="text-base" aria-hidden="true" />
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="min-h-[44px] inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:text-text-primary transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/register"
                  className="min-h-[44px] inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-all motion-reduce:transition-none shadow-md shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ──────────── HERO — asymmetric split ──────────── */}
      <main id="main-content" tabIndex={-1} className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-6 lg:py-12 focus:outline-none">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-14 items-center lg:min-h-[calc(100vh-180px)]">

          {/* Left: headline + copy + CTAs */}
          <div className="text-left">
            {isLoggedIn && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-text-secondary select-none animate-in fade-in slide-in-from-top-4 duration-300 motion-reduce:animate-none">
                <Icon icon="mdi:account-circle" className="text-primary text-base" aria-hidden="true" />
                <span>Welcome back, <strong className="text-text-primary">{user.name}</strong></span>
              </div>
            )}

            <h1 className="font-display text-4xl sm:text-5xl md:text-[3.4rem] font-extrabold tracking-tight leading-[1.1] mb-6">
              Your Personalized
              <span className="block mt-2 bg-gradient-to-r from-primary via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                AI Chat Workspace
              </span>
            </h1>

            <p className="text-text-secondary text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
              NovaMind is an enterprise-ready AI assistant that automatically
              remembers context and facts about you across conversations, while
              delivering multi-key Gemini execution and deep document RAG search.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {isLoggedIn ? (
                <Link
                  to="/new"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Enter Chat Workspace
                  <Icon icon="mdi:arrow-right" className="text-lg" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/register"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Create Account
                    <Icon icon="mdi:arrow-right" className="text-lg" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-border bg-surface/40 hover:bg-surface-hover text-text-primary font-semibold hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Sign In to Continue
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              All systems operational
            </div>
          </div>

          {/* Right: signature element — a live "memory" mockup card */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-3 sm:-inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-purple-500/5 to-transparent blur-2xl" />
            <div className="relative rounded-3xl border border-border bg-surface/50 backdrop-blur-md p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/60">
                <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
                <span className="text-xs font-semibold text-text-secondary">NovaMind &middot; remembers you</span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-white text-sm px-4 py-2.5 shadow-md shadow-primary/20">
                  {memoryPreview[0].q}
                </div>
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-surface-hover text-text-primary text-sm px-4 py-2.5">
                  {memoryPreview[0].a}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {memoryChips.map((chip, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ──────────── FEATURES ──────────── */}
        <div className="mt-14 lg:mt-20">
          <div className="flex items-center gap-4 mb-8">
            <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary whitespace-nowrap">
              Why teams choose NovaMind
            </h2>
            <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {/* Featured card — spans two rows, leads with the memory story from the hero */}
            <div className="group md:row-span-2 p-7 rounded-2xl border border-border bg-surface/30 hover:bg-surface/60 hover:border-primary/25 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 mb-6 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300">
                  <Icon icon={features[0].icon} className="text-2xl" aria-hidden="true" />
                </div>
                <h3 className="font-display font-semibold text-lg text-text-primary mb-3 group-hover:text-white transition-colors">
                  {features[0].title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {features[0].description}
                </p>
              </div>
            </div>

            {/* Remaining compact cards (Card 1 and 2) */}
            {features.slice(1, 3).map((feat, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl border border-border bg-surface/30 hover:bg-surface/60 hover:border-primary/25 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300">
                    <Icon icon={feat.icon} className="text-xl" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-text-primary mb-1.5 group-hover:text-white transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Last card — spans 2 columns on desktop to fill the grid without empty cells */}
            <div className="group md:col-span-2 p-6 rounded-2xl border border-border bg-surface/30 hover:bg-surface/60 hover:border-primary/25 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300">
                  <Icon icon={features[3].icon} className="text-xl" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm text-text-primary mb-1.5 group-hover:text-white transition-colors">
                    {features[3].title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {features[3].description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-7 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-secondary">
        <span>
          &copy; {new Date().getFullYear()} NovaMind AI. All rights reserved.
        </span>
        <a
          href="https://muhammadsajid.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-1.5 hover:text-text-primary transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-2"
        >
          <Icon icon="mdi:code-tags" className="text-base" aria-hidden="true" />
          Built by Muhammad Sajid
        </a>
      </footer>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of NovaMind?"
        confirmText="Sign Out"
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
}