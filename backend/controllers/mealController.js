/**
 * Meal Management Controller
 */
const pool = require('../config/db');
const { validateRequired, apiResponse, getToday } = require('../utils/helpers');

const getMeals = async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const [meals] = await pool.execute(
      `SELECT m.*, u.name as cook_name FROM meals m LEFT JOIN users u ON m.cook_id = u.id WHERE m.meal_date = ? ORDER BY FIELD(m.meal_type, 'suhoor','breakfast','lunch','dinner','snack')`, [date]
    );
    apiResponse(res, 200, { date, meals });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to fetch meals.' }); }
};

const addMeal = async (req, res) => {
  try {
    const { meal_date, meal_type, menu, ingredients, estimated_cost, cook_id, notes } = req.body;
    const error = validateRequired(req.body, ['meal_date', 'meal_type']);
    if (error) return apiResponse(res, 400, { error });
    const [result] = await pool.execute(
      `INSERT INTO meals (meal_date,meal_type,menu,ingredients,estimated_cost,cook_id,notes,created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [meal_date, meal_type, menu||null, ingredients||null, estimated_cost||null, cook_id||null, notes||null, req.user.id]
    );
    apiResponse(res, 201, { message: 'Meal planned.', meal: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return apiResponse(res, 409, { error: 'Meal already exists for this date/type.' });
    console.error(error); apiResponse(res, 500, { error: 'Failed to add meal.' });
  }
};

const updateMeal = async (req, res) => {
  try {
    const { menu, ingredients, estimated_cost, cook_id, status, notes } = req.body;
    const updates = [], values = [];
    if (menu !== undefined) { updates.push('menu=?'); values.push(menu); }
    if (ingredients !== undefined) { updates.push('ingredients=?'); values.push(ingredients); }
    if (estimated_cost !== undefined) { updates.push('estimated_cost=?'); values.push(estimated_cost); }
    if (cook_id !== undefined) { updates.push('cook_id=?'); values.push(cook_id||null); }
    if (status) { updates.push('status=?'); values.push(status); }
    if (notes !== undefined) { updates.push('notes=?'); values.push(notes); }
    if (updates.length === 0) return apiResponse(res, 400, { error: 'Nothing to update.' });
    values.push(req.params.id);
    const [result] = await pool.execute(`UPDATE meals SET ${updates.join(',')} WHERE id=?`, values);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Not found.' });
    apiResponse(res, 200, { message: 'Meal updated.' });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to update.' }); }
};

const deleteMeal = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM meals WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Not found.' });
    apiResponse(res, 200, { message: 'Meal deleted.' });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to delete.' }); }
};

module.exports = { getMeals, addMeal, updateMeal, deleteMeal };
