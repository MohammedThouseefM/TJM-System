/**
 * Announcements Controller
 */
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse } = require('../utils/helpers');

const getAnnouncements = async (req, res) => {
  try {
    const { limit, offset, page } = getPagination(req.query);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM announcements WHERE is_active = 1');
    const [announcements] = await pool.execute(
      `SELECT a.*, u.name as created_by_name FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.is_active = 1 ORDER BY a.priority = 'urgent' DESC, a.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    apiResponse(res, 200, { announcements, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to fetch announcements.' }); }
};

const addAnnouncement = async (req, res) => {
  try {
    const { title, message, priority } = req.body;
    const error = validateRequired(req.body, ['title', 'message']);
    if (error) return apiResponse(res, 400, { error });
    const [result] = await pool.execute(
      `INSERT INTO announcements (title, message, priority, created_by) VALUES (?,?,?,?)`,
      [title, message, priority || 'medium', req.user.id]
    );
    apiResponse(res, 201, { message: 'Announcement created.', announcement: { id: result.insertId } });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to create announcement.' }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const [result] = await pool.execute('UPDATE announcements SET is_active = 0 WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Not found.' });
    apiResponse(res, 200, { message: 'Announcement removed.' });
  } catch (error) { console.error(error); apiResponse(res, 500, { error: 'Failed to remove.' }); }
};

module.exports = { getAnnouncements, addAnnouncement, deleteAnnouncement };
