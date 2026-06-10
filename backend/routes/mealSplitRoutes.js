/**
 * Meal Split Routes
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMealsSummary, calculateSplit, generateSplitTransactions } = require('../controllers/mealSplitController');

// All routes require authentication
router.use(authenticate);

// GET /api/meal-split/meals  — fetch meals with cost for a date
router.get('/meals', getMealsSummary);

// POST /api/meal-split/calculate  — preview per-person split (no DB write)
router.post('/calculate', calculateSplit);

// POST /api/meal-split/generate  — create debit transactions (admin/accountant)
router.post('/generate', authorize('admin', 'accountant'), generateSplitTransactions);

module.exports = router;
