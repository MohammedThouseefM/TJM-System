/**
 * Route Planning Controller
 * Manages travel history and future route planning
 */
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse } = require('../utils/helpers');

// Get all routes with filters
const getAllRoutes = async (req, res) => {
  try {
    const { status } = req.query;
    const { limit, offset, page } = getPagination(req.query);
    let query = `SELECT r.*, u.name as created_by_name FROM routes r JOIN users u ON r.created_by = u.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM routes WHERE 1=1';
    const params = [], countParams = [];

    if (status) {
      query += ' AND r.status = ?'; countQuery += ' AND status = ?';
      params.push(status); countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    query += ` ORDER BY r.date_from DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [routes] = await pool.query(query, params);

    apiResponse(res, 200, { routes, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) { console.error('Get routes error:', error); apiResponse(res, 500, { error: 'Failed to fetch routes.' }); }
};

// Get route by ID
const getRouteById = async (req, res) => {
  try {
    const [routes] = await pool.execute(`SELECT r.*, u.name as created_by_name FROM routes r JOIN users u ON r.created_by = u.id WHERE r.id = ?`, [req.params.id]);
    if (routes.length === 0) return apiResponse(res, 404, { error: 'Route not found.' });
    apiResponse(res, 200, { route: routes[0] });
  } catch (error) { console.error('Get route error:', error); apiResponse(res, 500, { error: 'Failed to fetch route.' }); }
};

// Add new route
const addRoute = async (req, res) => {
  try {
    const { destination, date_from, date_to, purpose, activities, status, notes, latitude, longitude } = req.body;
    const error = validateRequired(req.body, ['destination', 'date_from']);
    if (error) return apiResponse(res, 400, { error });

    const [result] = await pool.execute(
      `INSERT INTO routes (destination, date_from, date_to, purpose, activities, status, notes, latitude, longitude, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [destination, date_from, date_to || null, purpose || null, activities || null, status || 'planned', notes || null, latitude || null, longitude || null, req.user.id]
    );
    apiResponse(res, 201, { message: 'Route added.', route: { id: result.insertId } });
  } catch (error) { console.error('Add route error:', error); apiResponse(res, 500, { error: 'Failed to add route.' }); }
};

// Update route
const updateRoute = async (req, res) => {
  try {
    const { destination, date_from, date_to, purpose, activities, status, notes, latitude, longitude } = req.body;
    const updates = [], values = [];
    if (destination) { updates.push('destination = ?'); values.push(destination); }
    if (date_from) { updates.push('date_from = ?'); values.push(date_from); }
    if (date_to !== undefined) { updates.push('date_to = ?'); values.push(date_to); }
    if (purpose !== undefined) { updates.push('purpose = ?'); values.push(purpose); }
    if (activities !== undefined) { updates.push('activities = ?'); values.push(activities); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (latitude !== undefined) { updates.push('latitude = ?'); values.push(latitude); }
    if (longitude !== undefined) { updates.push('longitude = ?'); values.push(longitude); }

    if (updates.length === 0) return apiResponse(res, 400, { error: 'Nothing to update.' });
    values.push(req.params.id);
    const [result] = await pool.execute(`UPDATE routes SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Route not found.' });
    apiResponse(res, 200, { message: 'Route updated.' });
  } catch (error) { console.error('Update route error:', error); apiResponse(res, 500, { error: 'Failed to update route.' }); }
};

// Delete route
const deleteRoute = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM routes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Route not found.' });
    apiResponse(res, 200, { message: 'Route deleted.' });
  } catch (error) { console.error('Delete route error:', error); apiResponse(res, 500, { error: 'Failed to delete route.' }); }
};

module.exports = { getAllRoutes, getRouteById, addRoute, updateRoute, deleteRoute };
