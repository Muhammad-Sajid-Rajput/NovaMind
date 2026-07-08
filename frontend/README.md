# 🎨 NovaMind Frontend — React + Vite + Tailwind CSS v4

The single-page React client interface for NovaMind. Built with React 18, Vite 8, and Tailwind CSS v4. Features JWT silent-token refreshing, Progressive Web App (PWA) caching, KaTeX math equation parsing, full-text sidebar matching, and dynamic user memory settings.

---

## 📂 Folder Structure

```plaintext
frontend/
├── index.html                # Base HTML — font loaders, KaTeX CDN styling
├── vite.config.js            # Dev proxy + PWA manifest compiler configuration
├── package.json              # Client dependencies and npm scripts
│
└── src/
    ├── App.jsx               # Client router & AuthGate navigation guard
    ├── main.jsx              # Application mount point
    ├── index.css             # Tailwind imports + custom design system overrides
    │
    ├── config/
    │   └── api.js            # Fetch wrapper with interceptors for silent token refresh
    │
    ├── core/                 # Shared features
    │   ├── components/       # ErrorBoundary, Loader, Toast, ErrorMessage
    │   └── context/          # ChatContext, Theme, AuthGate providers
    │
    └── features/             # Feature domains
        ├── auth/             # Login & OTP verification forms
        ├── sessions/         # Sidebar navigation + debounced session search
        ├── settings/         # Option sliders, model selector, user Memory UI
        └── chat/             # Message list, voice dictation, input tools
            └── components/
                ├── ChatInput.jsx    # Handles input, file selection & localStorage upload states
                └── FilePreview.jsx  # Renders files with upload/retry progress states
```

---

## ⚡ Setup & Run

### 1. Configure API Endpoint

The frontend looks for `VITE_API_URL` to know where the backend is. Create a `.env.development` or `.env.production` file:

```env
# For local development (proxied automatically via vite.config.js)
VITE_API_URL=http://localhost:5000
```

### 2. Launch Development Server

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build

```bash
npm run build
npm run preview
```

Compiles optimized, hashed static assets to `dist/` and runs a local server to preview the build.

---

## 🎹 Keyboard Shortcuts

Boost your efficiency with the following built-in shortcuts:

* `?` — Opens the key map reference cheatsheet.
* `Ctrl + K` — Launches a new chat workspace.
* `Ctrl + /` — Focuses the message textarea.
* `Ctrl + L` — Sweeps and deletes all existing sessions.
* `Ctrl + F` — Focuses the search bar in the session sidebar.
* `Ctrl + Shift + F` — Enters/Exits fullscreen view.

---

## 📎 File Upload & RAG State Flow

- Upload states are saved to `localStorage` (keyed by session ID) during ingestion to survive page reloads, HMR, and server restarts.
- Failed document processing runs up to 3 automatic retries with exponential back-off before entering a final failed state.
- Clicking the **"Failed — click to retry"** card re-queues the ingestion job on the backend immediately using cached Cloudinary metadata, bypassing any CDN re-upload.
- Clicking the `×` button on any file deletes the asset from Cloudinary and cleans up any parsed vector indexes in Pinecone.
- **Global Viewport Drag and Drop**: Dropping files anywhere on the browser window is captured, displaying a viewport-wide glassmorphic blur overlay with drag guides.
- **Checkmark Copy Delay**: Copy icons (in `MessageActions` and markdown code blocks) change to checkmark indicators for 5 seconds, disabling consecutive copy triggers.
