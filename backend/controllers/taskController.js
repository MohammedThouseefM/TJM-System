/**
 * Task Management Controller
 * Daily task creation, assignment, and status tracking
 */
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse, getToday } = require('../utils/helpers');

// Get tasks with filters
const getTasks = async (req, res) => {
  try {
    const { date, status, assigned_to, category } = req.query;
    const { limit, offset, page } = getPagination(req.query);
    let query = `SELECT t.*, a.name as assigned_to_name, c.name as created_by_name FROM tasks t LEFT JOIN users a ON t.assigned_to = a.id JOIN users c ON t.created_by = c.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    const params = [], countParams = [];

    if (req.user.role === 'member') {
      query += ' AND t.assigned_to = ?'; countQuery += ' AND assigned_to = ?';
      params.push(req.user.id); countParams.push(req.user.id);
    }
    if (date) { query += ' AND t.task_date = ?'; countQuery += ' AND task_date = ?'; params.push(date); countParams.push(date); }
    if (status) { query += ' AND t.status = ?'; countQuery += ' AND status = ?'; params.push(status); countParams.push(status); }
    if (assigned_to) { query += ' AND t.assigned_to = ?'; countQuery += ' AND assigned_to = ?'; params.push(assigned_to); countParams.push(assigned_to); }
    if (category) { query += ' AND t.category = ?'; countQuery += ' AND category = ?'; params.push(category); countParams.push(category); }

    const [countResult] = await pool.execute(countQuery, countParams);
    query += ` ORDER BY t.task_date DESC, t.due_time ASC LIMIT ${limit} OFFSET ${offset}`;
    const [tasks] = await pool.query(query, params);

    apiResponse(res, 200, { tasks, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) { console.error('Get tasks error:', error); apiResponse(res, 500, { error: 'Failed to fetch tasks.' }); }
};

// Add task
const addTask = async (req, res) => {
  try {
    const { title, description, task_date, due_time, assigned_to, category } = req.body;
    const error = validateRequired(req.body, ['title', 'task_date']);
    if (error) return apiResponse(res, 400, { error });

    const [result] = await pool.execute(
      `INSERT INTO tasks (title, description, task_date, due_time, assigned_to, category, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, task_date, due_time || null, assigned_to || null, category || 'other', req.user.id]
    );
    apiResponse(res, 201, { message: 'Task created.', task: { id: result.insertId } });
  } catch (error) { console.error('Add task error:', error); apiResponse(res, 500, { error: 'Failed to create task.' }); }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { title, description, task_date, due_time, status, assigned_to, category } = req.body;
    const updates = [], values = [];
    if (title) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (task_date) { updates.push('task_date = ?'); values.push(task_date); }
    if (due_time !== undefined) { updates.push('due_time = ?'); values.push(due_time); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to || null); }
    if (category) { updates.push('category = ?'); values.push(category); }

    if (updates.length === 0) return apiResponse(res, 400, { error: 'Nothing to update.' });
    values.push(req.params.id);
    const [result] = await pool.execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Task not found.' });
    apiResponse(res, 200, { message: 'Task updated.' });
  } catch (error) { console.error('Update task error:', error); apiResponse(res, 500, { error: 'Failed to update task.' }); }
};

// Update task status (members can update their own)
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in_progress', 'completed'].includes(status)) return apiResponse(res, 400, { error: 'Invalid status.' });

    let query = 'UPDATE tasks SET status = ? WHERE id = ?';
    const params = [status, req.params.id];
    if (req.user.role === 'member') { query += ' AND assigned_to = ?'; params.push(req.user.id); }

    const [result] = await pool.execute(query, params);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Task not found or not assigned to you.' });
    apiResponse(res, 200, { message: 'Task status updated.' });
  } catch (error) { console.error('Update status error:', error); apiResponse(res, 500, { error: 'Failed to update status.' }); }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Task not found.' });
    apiResponse(res, 200, { message: 'Task deleted.' });
  } catch (error) { console.error('Delete task error:', error); apiResponse(res, 500, { error: 'Failed to delete task.' }); }
};

module.exports = { getTasks, addTask, updateTask, updateTaskStatus, deleteTask };
