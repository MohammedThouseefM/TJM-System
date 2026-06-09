/**
 * Tableeghi Jamat Management System - Express Server
 * Main entry point for the backend API
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/duties', require('./routes/dutyRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/meals', require('./routes/mealRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.'
  });
});

// ── Start Server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🕌 Jamat Management System API`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
