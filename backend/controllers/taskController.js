/**
 * Task Management Controller
 * Daily task creation, assignment, and status tracking
 * Supports task-assignment matrix view (tasks × dates × persons)
 */
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse, getToday } = require('../utils/helpers');

// Ensure task_assignments table exists
const ensureAssignmentsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS task_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        assignment_date DATE NOT NULL,
        assigned_to INT DEFAULT NULL,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_task_date (task_id, assignment_date),
        INDEX idx_date (assignment_date),
        INDEX idx_assigned (assigned_to)
      )
    `);
  } catch (error) {
    // Table might already exist, ignore error
    if (!error.message.includes('already exists')) {
      console.error('Error creating task_assignments table:', error.message);
    }
  }
};

// Run on startup
ensureAssignmentsTable();

// Get tasks with filters (original endpoint - still works)
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

// Get task matrix - tasks with assignments across a date range
const getTaskMatrix = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return apiResponse(res, 400, { error: 'start_date and end_date are required.' });
    }

    // Get all tasks (no date filter - tasks are persistent items)
    let taskQuery = 'SELECT t.*, c.name as created_by_name FROM tasks t JOIN users c ON t.created_by = c.id';
    const taskParams = [];

    if (req.user.role === 'member') {
      taskQuery += ' WHERE t.assigned_to = ? OR t.id IN (SELECT task_id FROM task_assignments WHERE assigned_to = ?)';
      taskParams.push(req.user.id, req.user.id);
    }

    taskQuery += ' ORDER BY t.created_at ASC';
    const [tasks] = await pool.query(taskQuery, taskParams);

    // Get all assignments in the date range
    const [assignments] = await pool.execute(
      `SELECT ta.*, u.name as assigned_to_name 
       FROM task_assignments ta 
       LEFT JOIN users u ON ta.assigned_to = u.id 
       WHERE ta.assignment_date >= ? AND ta.assignment_date <= ?
       ORDER BY ta.assignment_date ASC`,
      [start_date, end_date]
    );

    // Build assignments map: { taskId: { date: assignment } }
    const assignmentsMap = {};
    assignments.forEach(a => {
      if (!assignmentsMap[a.task_id]) assignmentsMap[a.task_id] = {};
      const dateKey = new Date(a.assignment_date).toISOString().split('T')[0];
      assignmentsMap[a.task_id][dateKey] = {
        id: a.id,
        assigned_to: a.assigned_to,
        assigned_to_name: a.assigned_to_name,
        status: a.status,
      };
    });

    // Get all members for assignment dropdowns
    const [members] = await pool.execute(
      'SELECT id, name FROM users WHERE status = "active" ORDER BY name ASC'
    );

    apiResponse(res, 200, {
      tasks: tasks.map(t => ({
        ...t,
        assignments: assignmentsMap[t.id] || {}
      })),
      members,
      dateRange: { start_date, end_date }
    });
  } catch (error) {
    console.error('Get task matrix error:', error);
    apiResponse(res, 500, { error: 'Failed to fetch task matrix.' });
  }
};

// Assign or update a person for a task on a specific date
const assignTask = async (req, res) => {
  try {
    const { task_id, assignment_date, assigned_to } = req.body;
    const error = validateRequired(req.body, ['task_id', 'assignment_date']);
    if (error) return apiResponse(res, 400, { error });

    // Check task exists
    const [taskCheck] = await pool.execute('SELECT id FROM tasks WHERE id = ?', [task_id]);
    if (taskCheck.length === 0) return apiResponse(res, 404, { error: 'Task not found.' });

    // Upsert assignment (INSERT ... ON DUPLICATE KEY UPDATE)
    await pool.execute(
      `INSERT INTO task_assignments (task_id, assignment_date, assigned_to) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE assigned_to = VALUES(assigned_to), updated_at = CURRENT_TIMESTAMP`,
      [task_id, assignment_date, assigned_to || null]
    );

    // Get the assignment with user name
    const [result] = await pool.execute(
      `SELECT ta.*, u.name as assigned_to_name 
       FROM task_assignments ta 
       LEFT JOIN users u ON ta.assigned_to = u.id 
       WHERE ta.task_id = ? AND ta.assignment_date = ?`,
      [task_id, assignment_date]
    );

    apiResponse(res, 200, {
      message: 'Task assignment updated.',
      assignment: result[0]
    });
  } catch (error) {
    console.error('Assign task error:', error);
    apiResponse(res, 500, { error: 'Failed to assign task.' });
  }
};

// Add task
const addTask = async (req, res) => {
  try {
    const { title, description, task_date, due_time, assigned_to, category } = req.body;
    const error = validateRequired(req.body, ['title']);
    if (error) return apiResponse(res, 400, { error });

    const [result] = await pool.execute(
      `INSERT INTO tasks (title, description, task_date, due_time, assigned_to, category, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, task_date || getToday(), due_time || null, assigned_to || null, category || 'other', req.user.id]
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

module.exports = { getTasks, getTaskMatrix, assignTask, addTask, updateTask, updateTaskStatus, deleteTask };
