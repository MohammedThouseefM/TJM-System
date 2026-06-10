/**
 * Meal Cost Split Controller
 * Two methods of splitting meal costs among members:
 *   Method 1 (by_meal_type): total cost of a meal type ÷ consumers of that type
 *   Method 2 (by_day):       total cost of all meals on a day ÷ all consumers that day
 */
const pool = require('../config/db');
const { apiResponse, getToday } = require('../utils/helpers');

// ── Get meals summary for split calculation ──────────────────────
// GET /api/meal-split/meals?date=YYYY-MM-DD&meal_type=lunch
const getMealsSummary = async (req, res) => {
  try {
    const { date, meal_type } = req.query;
    if (!date) return apiResponse(res, 400, { error: 'date is required.' });

    let query = `
      SELECT m.id, m.meal_type, m.menu, m.estimated_cost, m.meal_date,
             u.name as cook_name
      FROM meals m
      LEFT JOIN users u ON m.cook_id = u.id
      WHERE m.meal_date = ? AND m.estimated_cost IS NOT NULL AND m.estimated_cost > 0
    `;
    const params = [date];

    if (meal_type) {
      query += ' AND m.meal_type = ?';
      params.push(meal_type);
    }
    query += ' ORDER BY FIELD(m.meal_type, "suhoor","breakfast","lunch","dinner","snack")';

    const [meals] = await pool.query(query, params);

    // Totals
    const totalCost = meals.reduce((sum, m) => sum + Number(m.estimated_cost || 0), 0);

    apiResponse(res, 200, { meals, totalCost, date, meal_type: meal_type || 'all' });
  } catch (err) {
    console.error('getMealsSummary error:', err);
    apiResponse(res, 500, { error: 'Failed to fetch meals summary.' });
  }
};

// ── Calculate split — Method 1: by meal type ────────────────────
// POST /api/meal-split/calculate
// body: { method: 'by_meal_type'|'by_day', date, meal_type?, consumer_ids: [] }
const calculateSplit = async (req, res) => {
  try {
    const { method, date, meal_type, consumer_ids } = req.body;

    if (!method || !date) return apiResponse(res, 400, { error: 'method and date are required.' });
    if (!consumer_ids || !Array.isArray(consumer_ids) || consumer_ids.length === 0) {
      return apiResponse(res, 400, { error: 'consumer_ids array is required.' });
    }

    let totalCost = 0;
    let meals = [];
    let label = '';

    if (method === 'by_meal_type') {
      if (!meal_type) return apiResponse(res, 400, { error: 'meal_type is required for by_meal_type method.' });

      const [rows] = await pool.query(
        `SELECT id, meal_type, menu, estimated_cost FROM meals WHERE meal_date = ? AND meal_type = ? AND estimated_cost > 0`,
        [date, meal_type]
      );
      meals = rows;
      totalCost = rows.reduce((sum, m) => sum + Number(m.estimated_cost || 0), 0);
      label = `${meal_type} on ${date}`;

    } else if (method === 'by_day') {
      const [rows] = await pool.query(
        `SELECT id, meal_type, menu, estimated_cost FROM meals WHERE meal_date = ? AND estimated_cost > 0`,
        [date]
      );
      meals = rows;
      totalCost = rows.reduce((sum, m) => sum + Number(m.estimated_cost || 0), 0);
      label = `all meals on ${date}`;

    } else {
      return apiResponse(res, 400, { error: 'method must be by_meal_type or by_day.' });
    }

    if (meals.length === 0) {
      return apiResponse(res, 404, { error: 'No meals found with cost for the given criteria.' });
    }

    if (totalCost === 0) {
      return apiResponse(res, 400, { error: 'Total meal cost is 0. Please enter estimated costs in Meals.' });
    }

    const numConsumers = consumer_ids.length;
    const perPerson = totalCost / numConsumers;
    const perPersonRounded = Math.round(perPerson * 100) / 100;

    // Fetch consumer names
    const placeholders = consumer_ids.map(() => '?').join(',');
    const [consumers] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id IN (${placeholders})`,
      consumer_ids
    );

    apiResponse(res, 200, {
      method,
      label,
      date,
      meal_type: meal_type || null,
      meals,
      totalCost,
      numConsumers,
      perPerson: perPersonRounded,
      consumers: consumers.map(c => ({
        ...c,
        share: perPersonRounded
      }))
    });

  } catch (err) {
    console.error('calculateSplit error:', err);
    apiResponse(res, 500, { error: 'Failed to calculate split.' });
  }
};

// ── Generate transactions from split ────────────────────────────
// POST /api/meal-split/generate
// body: { method, date, meal_type?, consumer_ids: [], description? }
const generateSplitTransactions = async (req, res) => {
  try {
    const { method, date, meal_type, consumer_ids, description } = req.body;

    if (!method || !date || !consumer_ids || consumer_ids.length === 0) {
      return apiResponse(res, 400, { error: 'method, date, and consumer_ids are required.' });
    }

    let totalCost = 0;

    if (method === 'by_meal_type') {
      if (!meal_type) return apiResponse(res, 400, { error: 'meal_type required.' });
      const [rows] = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost), 0) as total FROM meals WHERE meal_date = ? AND meal_type = ? AND estimated_cost > 0`,
        [date, meal_type]
      );
      totalCost = Number(rows[0].total);
    } else {
      const [rows] = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost), 0) as total FROM meals WHERE meal_date = ? AND estimated_cost > 0`,
        [date]
      );
      totalCost = Number(rows[0].total);
    }

    if (totalCost === 0) return apiResponse(res, 400, { error: 'Total meal cost is 0.' });

    const perPerson = Math.round((totalCost / consumer_ids.length) * 100) / 100;
    const txDesc = description ||
      (method === 'by_meal_type'
        ? `Meal split - ${meal_type} on ${date}`
        : `Meal split - all meals on ${date}`);

    let created = 0;
    for (const uid of consumer_ids) {
      await pool.execute(
        `INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by)
         VALUES (?, 'debit', ?, ?, 'food', ?, ?)`,
        [uid, perPerson, txDesc, date, req.user.id]
      );
      created++;
    }

    apiResponse(res, 201, {
      message: `${created} debit transaction${created > 1 ? 's' : ''} created. ₹${perPerson} per person from ₹${totalCost} total.`,
      totalCost,
      perPerson,
      numConsumers: created,
      created
    });

  } catch (err) {
    console.error('generateSplitTransactions error:', err);
    apiResponse(res, 500, { error: 'Failed to generate transactions.' });
  }
};

module.exports = { getMealsSummary, calculateSplit, generateSplitTransactions };
