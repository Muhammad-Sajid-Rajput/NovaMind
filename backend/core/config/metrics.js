// NovaMind — metrics.js — Phase 5
// Prometheus metrics registry and metric definitions.
// Import from this module to record events across the app.

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

export const register = new Registry();
register.setDefaultLabels({ app: 'novamind' });

// Collect default Node.js runtime metrics (heap, event loop lag, GC, etc.)
collectDefaultMetrics({ register });

// ── HTTP Request counter ──────────────────────────────────────────────────────
export const httpRequestsTotal = new Counter({
  name:       'http_requests_total',
  help:       'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status'],
  registers:  [register],
});

// ── HTTP Request duration histogram ──────────────────────────────────────────
export const httpRequestDuration = new Histogram({
  name:       'http_request_duration_seconds',
  help:       'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets:    [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers:  [register],
});

// ── Active SSE streaming connections ─────────────────────────────────────────
export const activeStreams = new Gauge({
  name:      'active_sse_streams',
  help:      'Number of currently active SSE streaming connections',
  registers: [register],
});

// ── MongoDB active connections ────────────────────────────────────────────────
export const dbConnections = new Gauge({
  name:      'mongodb_connections_active',
  help:      'Active MongoDB connections reported by Mongoose',
  registers: [register],
});

// ── Chat messages sent counter ────────────────────────────────────────────────
export const messagesSentTotal = new Counter({
  name:      'messages_sent_total',
  help:      'Total number of chat messages sent by users',
  registers: [register],
});

// ── Gemini model usage counter ────────────────────────────────────────────────
export const modelUsageTotal = new Counter({
  name:       'gemini_model_usage_total',
  help:       'Total Gemini API calls per model',
  labelNames: ['model'],
  registers:  [register],
});

// ── Memory extractions counter ────────────────────────────────────────────────
export const memoryExtractionsTotal = new Counter({
  name:      'memory_extractions_total',
  help:      'Total number of memory facts extracted from conversations',
  registers: [register],
});
