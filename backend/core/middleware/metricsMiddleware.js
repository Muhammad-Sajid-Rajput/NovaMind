// NovaMind — metricsMiddleware.js — Phase 5
// Express middleware that records HTTP request count and duration
// for every response. Attaches to res.finish so SSE streams are
// also counted once the connection closes.

import {
  httpRequestsTotal,
  httpRequestDuration,
} from '../config/metrics.js';

export const metricsMiddleware = (req, res, next) => {
  const startMs = Date.now();

  res.on('finish', () => {
    const durationSecs = (Date.now() - startMs) / 1000;
    // Use the matched Express route path (e.g. /api/chat/stream) when
    // available; fall back to the raw path to avoid high-cardinality labels.
    const route = req.route?.path ?? req.path;

    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSecs);
  });

  next();
};
