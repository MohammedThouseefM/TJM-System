/**
 * Utility Helper Functions
 * Common functions used across controllers
 */

/**
 * Format date to YYYY-MM-DD string
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
const getToday = () => {
  return formatDate(new Date());
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {string[]} fields - Required field names
 * @returns {string|null} Error message or null if valid
 */
const validateRequired = (body, fields) => {
  const missing = fields.filter(field => !body[field] && body[field] !== 0);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
};

/**
 * Build pagination parameters from query
 * @param {Object} query - Request query parameters
 * @returns {Object} { limit, offset, page }
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { limit, offset, page };
};

/**
 * Create standardized API response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {Object} data - Response data
 */
const apiResponse = (res, status, data) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    ...data
  });
};

/**
 * Handle async controller errors
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  formatDate,
  getToday,
  validateRequired,
  getPagination,
  apiResponse,
  asyncHandler
};
