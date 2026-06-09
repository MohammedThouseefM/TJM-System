/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control
 */
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Verify JWT token from Authorization header
 * Attaches user object to req.user on success
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from database
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, phone, status, joining_date FROM users WHERE id = ? AND status = "active"',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'member', 'accountant', 'route_planner')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
