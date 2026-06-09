/**
 * Member Management Controller
 * CRUD operations for jamat members
 */
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse } = require('../utils/helpers');

/**
 * Get all members with search/filter
 * GET /api/members?search=&role=&status=&page=&limit=
 */
const getAllMembers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const { limit, offset, page } = getPagination(req.query);

    let query = 'SELECT id, name, email, phone, role, status, joining_date, current_duty, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search by name or email
    if (search) {
      const searchClause = ' AND (name LIKE ? OR email LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    // Filter by role
    if (role && ['admin', 'member', 'accountant', 'route_planner'].includes(role)) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }

    // Filter by status
    if (status && ['active', 'inactive', 'leave'].includes(status)) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Get total count
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get paginated results
    // Inline LIMIT/OFFSET as integers (TiDB doesn't accept them as bound params)
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const [members] = await pool.query(query, params);

    apiResponse(res, 200, {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    apiResponse(res, 500, { error: 'Failed to fetch members.' });
  }
};

/**
 * Get a single member by ID
 * GET /api/members/:id
 */
const getMemberById = async (req, res) => {
  try {
    const [members] = await pool.execute(
      `SELECT id, name, email, phone, role, status, joining_date, current_duty, avatar, created_at 
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (members.length === 0) {
      return apiResponse(res, 404, { error: 'Member not found.' });
    }

    apiResponse(res, 200, { member: members[0] });
  } catch (error) {
    console.error('Get member error:', error);
    apiResponse(res, 500, { error: 'Failed to fetch member.' });
  }
};

/**
 * Add a new member (Admin only)
 * POST /api/members
 */
const addMember = async (req, res) => {
  try {
    const { name, email, password, phone, role, joining_date } = req.body;

    const error = validateRequired(req.body, ['name', 'email', 'password']);
    if (error) return apiResponse(res, 400, { error });

    // Check duplicate email
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return apiResponse(res, 409, { error: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const memberRole = ['admin', 'member', 'accountant', 'route_planner'].includes(role) ? role : 'member';
    // Use provided joining_date or fall back to today
    const joiningDate = joining_date || new Date().toISOString().split('T')[0];

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, phone, role, joining_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, phone || null, memberRole, joiningDate]
    );

    apiResponse(res, 201, {
      message: 'Member added successfully.',
      member: { id: result.insertId, name, email, role: memberRole, phone, joining_date: joiningDate }
    });
  } catch (error) {
    console.error('Add member error:', error);
    apiResponse(res, 500, { error: 'Failed to add member.' });
  }
};

/**
 * Update a member (Admin only)
 * PUT /api/members/:id
 */
const updateMember = async (req, res) => {
  try {
    const { name, phone, role, status, current_duty, joining_date } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (role && ['admin', 'member', 'accountant', 'route_planner'].includes(role)) {
      updates.push('role = ?'); values.push(role);
    }
    if (status && ['active', 'inactive', 'leave'].includes(status)) {
      updates.push('status = ?'); values.push(status);
    }
    if (current_duty !== undefined) { updates.push('current_duty = ?'); values.push(current_duty); }
    if (joining_date) { updates.push('joining_date = ?'); values.push(joining_date); }

    if (updates.length === 0) {
      return apiResponse(res, 400, { error: 'No fields to update.' });
    }

    values.push(req.params.id);
    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return apiResponse(res, 404, { error: 'Member not found.' });
    }

    apiResponse(res, 200, { message: 'Member updated successfully.' });
  } catch (error) {
    console.error('Update member error:', error);
    apiResponse(res, 500, { error: 'Failed to update member.' });
  }
};

/**
 * Delete a member (Admin only)
 * DELETE /api/members/:id
 */
const deleteMember = async (req, res) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user.id) {
      return apiResponse(res, 400, { error: 'Cannot delete your own account.' });
    }

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return apiResponse(res, 404, { error: 'Member not found.' });
    }

    apiResponse(res, 200, { message: 'Member deleted successfully.' });
  } catch (error) {
    console.error('Delete member error:', error);
    apiResponse(res, 500, { error: 'Failed to delete member.' });
  }
};

module.exports = { getAllMembers, getMemberById, addMember, updateMember, deleteMember };
