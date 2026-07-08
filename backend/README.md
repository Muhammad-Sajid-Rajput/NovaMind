# 🧠 NovaMind Backend — Express + Gemini AI

The Express.js REST/SSE API for NovaMind. Handles JWT dual-token authentication, Gemini 3-key rotation (streaming + fallback), MongoDB persistence, email OTP via Resend, real-time Prometheus metrics, background RAG document ingestion via BullMQ + Redis, and vector search via Pinecone.

---

## 📂 Directory Structure

```plaintext
backend/
├── server.js                    # Entry point — DB connect, BullMQ workers, HTTP listener
├── app.js                       # Express config — CORS, parsers, middlewares, routes
│
├── core/                        # Shared infrastructure
│   ├── ai/
│   │   ├── chunkers/            # Text chunking strategies by file type
│   │   └── parsers/             # Document parsers (PDF, PPTX, DOCX, XLSX, TXT, CSV)
│   ├── config/
│   │   ├── gemini.js            # Round-robin multi-key Gemini initializer
│   │   ├── metrics.js           # Prometheus metrics registry
│   │   ├── redis.js             # BullMQ Redis connection
│   │   └── systemPrompt.js      # System prompt builder with AI memory injection
│   ├── db/
│   │   ├── connect.js           # MongoDB connection handler
│   │   └── seed.js              # Dev/test seed script
│   ├── middleware/
│   │   ├── auth.js              # requireAuth JWT gatekeeper
│   │   ├── errorHandler.js      # Global structured JSON error responses
│   │   ├── metricsMiddleware.js # HTTP timing for Prometheus histograms
│   │   └── rateLimit.js         # Per-route rate limiters
│   └── services/
│       ├── emailService.js      # OTP verification emails via Resend
│       ├── embeddingService.js  # Gemini text embeddings — batched, 100 RPM rate-safe
│       ├── geminiService.js     # Streaming + non-streaming Gemini wrappers
│       ├── pineconeService.js   # Vector upsert & similarity search client
│       └── tavilyService.js     # Real-time web search API
│
├── modules/
│   ├── auth/                    # Register, OTP verify, login, password change, account delete
│   ├── chat/                    # SSE streaming, Tavily web injection, full-text search
│   ├── memory/                  # AI fact extraction from conversations (fire-and-forget)
│   ├── messages/                # FIFO-capped message history (200 msgs/session)
│   ├── models/                  # MongoDB TTL model cooldown definitions
│   ├── sessions/                # Chat room creation, listing, renaming
│   └── upload/
│       ├── upload.controller.js # Signature gen, ingest queue, status polling, cancel
│       ├── upload.routes.js     # /api/upload/* route definitions
│       ├── models/
│       │   └── FileRegistry.model.js  # Per-file ingest state (queued → parsing → indexed)
│       ├── queues/
│       │   ├── ingestQueue.js   # BullMQ queue definition & job options
│       │   └── ingestWorker.js  # Parse → chunk → embed → upsert worker pipeline
│       ├── services/
│       │   └── cancelService.js # Cloudinary delete + Pinecone vector cleanup
│       └── utils/
│           └── mimeValidator.js # Magic-byte file signature validation
│
└── routes/                      # Top-level Express router aggregator
```

---

## ⚡ Setup & Run

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | HTTP server port (default: 5000) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `ALLOWED_ORIGIN` | ✅ | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `MONGODB_URI` | ✅ | MongoDB Atlas or local connection string |
| `GEMINI_API_KEY_1` | ✅ | Primary Gemini API key |
| `GEMINI_API_KEY_2` | ⬜ | Optional second key (2× quota) |
| `GEMINI_API_KEY_3` | ⬜ | Optional third key (3× quota) |
| `RESEND_API_KEY` | ✅ | Resend API key for email OTP |
| `RESEND_FROM` | ✅ | Verified sender address |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `REDIS_URL` | ✅ | Redis connection URL (BullMQ) |
| `PINECONE_API_KEY` | ✅ | Pinecone API key |
| `PINECONE_INDEX` | ✅ | Pinecone index name (e.g. `novamind`) |
| `TAVILY_API_KEY` | ✅ | Tavily web search API key |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars — signs 15-min access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars — signs 30-day refresh tokens |
| `METRICS_SECRET` | ✅ | Min 8 chars — guards `/metrics` endpoint |

### 2. Commands

```bash
npm install
npm run dev     # Starts with --watch (auto-restarts on change)
npm start       # Production mode
npm test        # Jest test suite
```

---

## 🔌 API Reference

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create account & send OTP email |
| POST | `/verify-email` | Verify OTP → issue JWT tokens |
| POST | `/login` | Authenticate & issue JWT tokens |
| POST | `/refresh` | Rotate access token via httpOnly refresh cookie |
| POST | `/logout` | Clear refresh cookie |
| PATCH | `/change-password` | Update password (auth required) |
| DELETE | `/account` | Cascade-delete all user data |

### 💬 Chat — `/api/chat`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/stream` | SSE token stream — main chat endpoint |
| POST | `/vision` | Multimodal image analysis |
| GET | `/search?q=` | Full-text message history search |

### 📎 Upload — `/api/upload`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/signature` | Returns a signed Cloudinary upload URL |
| POST | `/ingest` | Queue a document for RAG ingestion |
| GET | `/ingest/:jobId` | Poll ingest job status & progress |
| POST | `/cancel` | Delete file from Cloudinary + Pinecone vectors |

### 🧠 Memory — `/api/memory`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Fetch all extracted user facts |
| DELETE | `/:id` | Delete a single memory |
| DELETE | `/` | Clear all memories |

### 💬 Sessions — `/api/sessions`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all sessions for current user |
| POST | `/` | Create a new session |
| PATCH | `/:id` | Rename a session |
| DELETE | `/:id` | Delete session + all its messages |

### 📨 Messages — `/api/messages`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/:sessionId` | Fetch message history for a session |

---

## 📄 RAG Ingest Pipeline

```
Client uploads → Cloudinary CDN
        ↓
POST /api/upload/ingest → BullMQ job queued
        ↓
ingestWorker.js:
  1. Download file buffer from Cloudinary
  2. Validate magic-byte signature (mimeValidator)
  3. Parse document → DocumentModel[]  (parserRegistry)
  4. Chunk text → chunks[]             (chunkerRegistry)
  5. Embed chunks via Gemini           (embeddingService — batched 10/req, 8s pause)
  6. Upsert vectors → Pinecone
  7. Update FileRegistry status → Indexed
        ↓
GET /api/upload/ingest/:jobId  (polled by frontend every 2s)
```

### 🔒 Upload Limits & Rates
- **Message limit**: Users can upload only up to **2 files in a single message** (`messageId` validation).
- **Daily limit**: Users can upload up to **2 files of each document type** in a rolling 24-hour window. Document categories are computed dynamically:
  - `pdf` (PDF documents)
  - `word` (Word documents: `.docx`, `.doc`)
  - `excel` (Spreadsheets and tabular data: `.xlsx`, `.xls`, `.csv`)
  - `powerpoint` (Presentations: `.pptx`, `.ppt`)
  - `text` (Plain text files: `.txt`)
  - `image` (Images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`)
- **Image Daily Limit Tracking**: Corrected the double-counting bug in daily limit tracking for images by verifying if the message contains multiple-file arrays first, falling back to legacy single-file representations only when necessary.

---

## 📈 Prometheus Metrics (`GET /metrics`)

Secured by `X-Metrics-Secret` header.

| Metric | Description |
|---|---|
| `http_requests_total` | Request count by method, route, status |
| `http_request_duration_seconds` | REST & SSE latency histogram |
| `active_sse_streams` | Live SSE connections gauge |
| `mongodb_connections_active` | Open MongoDB connection pool size |
| `gemini_model_usage_total` | API calls per Gemini model |
