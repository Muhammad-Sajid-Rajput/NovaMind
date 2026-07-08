# NovaMind — frontend/Dockerfile — Phase 2
# Multi-stage build:
#   Stage 1 (builder): Node + Vite compiles the React app into static /dist assets.
#   Stage 2 (runner):  Nginx Alpine serves those static files and proxies /api to backend.

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cache layer — only re-runs when package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build for production
# Vite reads .env.production automatically during `npm run build`
COPY . .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
# Use a minimal Nginx image — no Node.js, no build tools, just a static file server.
FROM nginx:1.27-alpine AS runner

# Replace the default Nginx config with our custom one
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
