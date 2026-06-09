/**
 * Dashboard Controller - Aggregated summary data
 */
const pool = require('../config/db');
const { apiResponse, getToday } = require('../utils/helpers');

const getDashboardData = async (req, res) => {
  try {
    const today = getToday();

    // Active members count
    const [membersCount] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE status = "active"');

    // Today's tasks summary
    const [tasksSummary] = await pool.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress FROM tasks WHERE task_date = ?`, [today]
    );

    // Today's financial summary
    const [financeSummary] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as today_credits, COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as today_debits FROM transactions WHERE transaction_date = ?`, [today]
    );

    // Treasury balance
    const [treasury] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as balance FROM transactions`
    );

    // Today's attendance
    const [attendanceSummary] = await pool.execute(
      `SELECT COUNT(*) as marked, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendance WHERE attendance_date = ?`, [today]
    );

    // Next planned route
    const [nextRoute] = await pool.execute(
      `SELECT destination, date_from, date_to, purpose FROM routes WHERE status = 'planned' AND date_from >= ? ORDER BY date_from ASC LIMIT 1`, [today]
    );

    // Recent announcements (top 3)
    const [announcements] = await pool.execute(
      `SELECT a.title, a.message, a.priority, a.created_at, u.name as author FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.is_active = 1 ORDER BY a.created_at DESC LIMIT 3`
    );

    // Today's duties
    const [duties] = await pool.execute(
      `SELECT d.duty_type, d.status, u.name as assigned_to_name FROM duty_roster d JOIN users u ON d.assigned_to = u.id WHERE d.duty_date = ?`, [today]
    );

    // Expense trend (last 7 days)
    const [expenseTrend] = await pool.execute(
      `SELECT transaction_date as date, COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as expenses, COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as income FROM transactions WHERE transaction_date >= DATE_SUB(?, INTERVAL 7 DAY) GROUP BY transaction_date ORDER BY transaction_date`, [today]
    );

    apiResponse(res, 200, {
      today,
      activeMembers: membersCount[0].total,
      tasks: tasksSummary[0],
      finance: { ...financeSummary[0], treasury_balance: treasury[0].balance },
      attendance: attendanceSummary[0],
      nextRoute: nextRoute[0] || null,
      announcements,
      duties,
      expenseTrend
    });
  } catch (error) { console.error('Dashboard error:', error); apiResponse(res, 500, { error: 'Failed to load dashboard.' }); }
};

module.exports = { getDashboardData };
