/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validateRequired, apiResponse } = require('../utils/helpers');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    const error = validateRequired(req.body, ['name', 'email', 'password']);
    if (error) return apiResponse(res, 400, { error });

    // Check if email already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return apiResponse(res, 409, { error: 'Email already registered.' });
    }

    // Hash password and create user
    const password_hash = await bcrypt.hash(password, 12);
    const userRole = ['admin', 'member', 'accountant', 'route_planner'].includes(role) ? role : 'member';

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, phone, role, joining_date) 
       VALUES (?, ?, ?, ?, ?, CURRENT_DATE)`,
      [name, email, password_hash, phone || null, userRole]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    apiResponse(res, 201, {
      message: 'Registration successful.',
      token,
      user: { id: result.insertId, name, email, role: userRole, phone }
    });
  } catch (error) {
    console.error('Register error:', error);
    apiResponse(res, 500, { error: 'Registration failed. Please try again.' });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const error = validateRequired(req.body, ['email', 'password']);
    if (error) return apiResponse(res, 400, { error });

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, phone, role, status, joining_date FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return apiResponse(res, 401, { error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'active') {
      return apiResponse(res, 403, { error: 'Account is inactive. Contact admin.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return apiResponse(res, 401, { error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password hash from response
    delete user.password_hash;

    apiResponse(res, 200, {
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error details:', error.code, error.message);
    apiResponse(res, 500, { error: 'Login failed. Please try again.' });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, name, email, phone, role, status, joining_date, current_duty, avatar, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return apiResponse(res, 404, { error: 'User not found.' });
    }

    apiResponse(res, 200, { user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    apiResponse(res, 500, { error: 'Failed to fetch profile.' });
  }
};

/**
 * Update current user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (avatar) { updates.push('avatar = ?'); values.push(avatar); }

    if (updates.length === 0) {
      return apiResponse(res, 400, { error: 'No fields to update.' });
    }

    values.push(req.user.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    apiResponse(res, 200, { message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    apiResponse(res, 500, { error: 'Failed to update profile.' });
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const error = validateRequired(req.body, ['currentPassword', 'newPassword']);
    if (error) return apiResponse(res, 400, { error });

    if (newPassword.length < 6) {
      return apiResponse(res, 400, { error: 'New password must be at least 6 characters.' });
    }

    // Verify current password
    const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return apiResponse(res, 401, { error: 'Current password is incorrect.' });
    }

    // Hash and update new password
    const password_hash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

    apiResponse(res, 200, { message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    apiResponse(res, 500, { error: 'Failed to change password.' });
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
