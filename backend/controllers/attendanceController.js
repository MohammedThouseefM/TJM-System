/**
 * Attendance Controller
 * Mark and track member attendance
 */
const pool = require('../config/db');
const { apiResponse, getToday } = require('../utils/helpers');

// Get attendance for a date
const getAttendance = async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const [attendance] = await pool.execute(
      `SELECT a.*, u.name as member_name, u.phone, m.name as marked_by_name
       FROM attendance a JOIN users u ON a.user_id = u.id LEFT JOIN users m ON a.marked_by = m.id
       WHERE a.attendance_date = ? ORDER BY u.name`,
      [date]
    );

    // Get all active members for cross-reference
    const [allMembers] = await pool.execute('SELECT id, name FROM users WHERE status = "active" ORDER BY name');
    const markedIds = new Set(attendance.map(a => a.user_id));
    const unmarked = allMembers.filter(m => !markedIds.has(m.id));

    const [summary] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM attendance WHERE attendance_date = ? GROUP BY status`, [date]
    );

    apiResponse(res, 200, { date, attendance, unmarked, summary });
  } catch (error) { console.error('Get attendance error:', error); apiResponse(res, 500, { error: 'Failed to fetch attendance.' }); }
};

// Mark attendance (single or bulk)
const markAttendance = async (req, res) => {
  try {
    const { records, date } = req.body;
    // records: [{ user_id, status, notes }]
    if (!records || !Array.isArray(records) || records.length === 0) {
      return apiResponse(res, 400, { error: 'Records array is required.' });
    }

    const attendanceDate = date || getToday();
    let marked = 0;

    for (const record of records) {
      if (!record.user_id || !record.status) continue;
      await pool.execute(
        `INSERT INTO attendance (user_id, attendance_date, status, notes, marked_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), marked_by = VALUES(marked_by)`,
        [record.user_id, attendanceDate, record.status, record.notes || null, req.user.id]
      );
      marked++;
    }

    apiResponse(res, 200, { message: `Attendance marked for ${marked} members.` });
  } catch (error) { console.error('Mark attendance error:', error); apiResponse(res, 500, { error: 'Failed to mark attendance.' }); }
};

// Get attendance summary for date range
const getAttendanceSummary = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    if (!date_from || !date_to) return apiResponse(res, 400, { error: 'date_from and date_to required.' });

    const [summary] = await pool.execute(
      `SELECT u.id, u.name,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days,
        COUNT(a.id) as total_records
       FROM users u LEFT JOIN attendance a ON u.id = a.user_id AND a.attendance_date BETWEEN ? AND ?
       WHERE u.status = 'active' GROUP BY u.id, u.name ORDER BY u.name`,
      [date_from, date_to]
    );

    apiResponse(res, 200, { date_from, date_to, summary });
  } catch (error) { console.error('Attendance summary error:', error); apiResponse(res, 500, { error: 'Failed to fetch summary.' }); }
};

module.exports = { getAttendance, markAttendance, getAttendanceSummary };
