/**
 * server.js – FinSight Express backend
 *
 * Serves:
 *  - Static frontend (index.html + reconciliation-samples/)
 *  - REST API under /api/*
 *
 * Start: node server.js
 * Default port: 3000  (override with PORT env var)
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || `http://localhost:${process.env.PORT || 3000}` }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve the frontend (index.html + static assets) from project root
app.use(['/backend', '/data', '/uploads', '/node_modules'], (_req, res) => res.status(404).send('Not found'));
app.use((req, res, next) => /\.(db|db-shm|db-wal|env)$/i.test(req.path) ? res.status(404).send('Not found') : next());
app.use(express.static(__dirname));

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/transactions', require('./backend/routes/transactions'));
app.use('/api/reconcile',    require('./backend/routes/reconcile'));
app.use('/api/risk',         require('./backend/routes/risk'));
app.use('/api/reviews',      require('./backend/routes/reviews'));
app.use('/api/user',         require('./backend/routes/user'));

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'FinSight API', version: '1.0.0', ts: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// SPA fallback – all non-API GET requests → index.html
// ──────────────────────────────────────────────
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, error: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ──────────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: 'File too large (max 10 MB)' });
  }
  if (err instanceof require('multer').MulterError) return res.status(400).json({ ok: false, error: err.message });
  if (err.message?.includes('upload CSV files only')) return res.status(415).json({ ok: false, error: err.message });
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  FinSight backend running at http://localhost:${PORT}`);
  console.log(`  API docs: see README.md\n`);
});
