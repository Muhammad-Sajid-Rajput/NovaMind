# NovaMind — backend/Dockerfile — Phase 2
# Multi-stage build: installs only production deps, then copies source.
# Runs as a non-root user (nodejs) for security hardening.

# ─── Stage 1: Install production dependencies only ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /usr/src/app

COPY package*.json ./
# ci = clean install, respects lock file exactly
RUN npm ci --only=production

# ─── Stage 2: Minimal runtime image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Create a non-root system user/group for security
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001

# Copy installed node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Drop root — all subsequent commands run as nodejs
USER nodejs

EXPOSE 5000

CMD ["node", "server.js"]
