/**
 * Duty Roster Controller
 * Automatic rotation and management of common duties
 */
const pool = require('../config/db');
const { apiResponse, getToday } = require('../utils/helpers');

// Get duty roster by date
const getDutyRoster = async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const [duties] = await pool.execute(
      `SELECT d.*, u.name as assigned_to_name FROM duty_roster d JOIN users u ON d.assigned_to = u.id WHERE d.duty_date = ? ORDER BY d.duty_type, d.shift`,
      [date]
    );
    apiResponse(res, 200, { date, duties });
  } catch (error) { console.error('Get duty roster error:', error); apiResponse(res, 500, { error: 'Failed to fetch duty roster.' }); }
};

// Assign duty
const assignDuty = async (req, res) => {
  try {
    const { duty_type, assigned_to, duty_date, shift, notes } = req.body;
    if (!duty_type || !assigned_to || !duty_date) return apiResponse(res, 400, { error: 'duty_type, assigned_to, and duty_date are required.' });

    const [result] = await pool.execute(
      `INSERT INTO duty_roster (duty_type, assigned_to, duty_date, shift, notes, created_by) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE assigned_to = VALUES(assigned_to), notes = VALUES(notes)`,
      [duty_type, assigned_to, duty_date, shift || 'full_day', notes || null, req.user.id]
    );
    apiResponse(res, 201, { message: 'Duty assigned.', duty: { id: result.insertId } });
  } catch (error) { console.error('Assign duty error:', error); apiResponse(res, 500, { error: 'Failed to assign duty.' }); }
};

// Generate automatic rotation for a date range
const generateRotation = async (req, res) => {
  try {
    const { start_date, end_date, duty_types } = req.body;
    if (!start_date || !end_date) return apiResponse(res, 400, { error: 'start_date and end_date required.' });

    const types = duty_types || ['meal', 'cleaning', 'security'];
    const [members] = await pool.execute('SELECT id, name FROM users WHERE status = "active" ORDER BY id');
    if (members.length === 0) return apiResponse(res, 400, { error: 'No active members.' });

    const start = new Date(start_date);
    const end = new Date(end_date);
    let assigned = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      for (let t = 0; t < types.length; t++) {
        const memberIdx = (Math.floor((d - start) / 86400000) + t) % members.length;
        try {
          await pool.execute(
            `INSERT IGNORE INTO duty_roster (duty_type, assigned_to, duty_date, shift, created_by) VALUES (?, ?, ?, 'full_day', ?)`,
            [types[t], members[memberIdx].id, dateStr, req.user.id]
          );
          assigned++;
        } catch (e) { /* duplicate key - skip */ }
      }
    }

    apiResponse(res, 201, { message: `Rotation generated. ${assigned} duties assigned.` });
  } catch (error) { console.error('Generate rotation error:', error); apiResponse(res, 500, { error: 'Failed to generate rotation.' }); }
};

// Update duty status
const updateDutyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed'].includes(status)) return apiResponse(res, 400, { error: 'Invalid status.' });
    const [result] = await pool.execute('UPDATE duty_roster SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Duty not found.' });
    apiResponse(res, 200, { message: 'Duty status updated.' });
  } catch (error) { console.error('Update duty status error:', error); apiResponse(res, 500, { error: 'Failed to update status.' }); }
};

// Delete duty
const deleteDuty = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM duty_roster WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Duty not found.' });
    apiResponse(res, 200, { message: 'Duty deleted.' });
  } catch (error) { console.error('Delete duty error:', error); apiResponse(res, 500, { error: 'Failed to delete.' }); }
};

module.exports = { getDutyRoster, assignDuty, generateRotation, updateDutyStatus, deleteDuty };
