/**
 * Financial Accounting Controller
 * Manages contributions, expenses, balances, and financial reporting
 */
const pool = require('../config/db');
const { validateRequired, getPagination, apiResponse, getToday } = require('../utils/helpers');

// Get all transactions with filters
const getTransactions = async (req, res) => {
  try {
    const { user_id, type, category, date_from, date_to } = req.query;
    const { limit, offset, page } = getPagination(req.query);
    let query = `SELECT t.*, u.name as member_name, c.name as created_by_name 
      FROM transactions t JOIN users u ON t.user_id = u.id JOIN users c ON t.created_by = c.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
    const params = [], countParams = [];

    if (req.user.role === 'member') {
      query += ' AND t.user_id = ?'; countQuery += ' AND t.user_id = ?';
      params.push(req.user.id); countParams.push(req.user.id);
    } else if (user_id) {
      query += ' AND t.user_id = ?'; countQuery += ' AND t.user_id = ?';
      params.push(user_id); countParams.push(user_id);
    }
    if (type) { query += ' AND t.type = ?'; countQuery += ' AND t.type = ?'; params.push(type); countParams.push(type); }
    if (category) { query += ' AND t.category = ?'; countQuery += ' AND t.category = ?'; params.push(category); countParams.push(category); }
    if (date_from) { query += ' AND t.transaction_date >= ?'; countQuery += ' AND t.transaction_date >= ?'; params.push(date_from); countParams.push(date_from); }
    if (date_to) { query += ' AND t.transaction_date <= ?'; countQuery += ' AND t.transaction_date <= ?'; params.push(date_to); countParams.push(date_to); }

    const [countResult] = await pool.execute(countQuery, countParams);
    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [transactions] = await pool.query(query, params);

    apiResponse(res, 200, { transactions, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) { console.error('Get transactions error:', error); apiResponse(res, 500, { error: 'Failed to fetch transactions.' }); }
};

// Add a new transaction
const addTransaction = async (req, res) => {
  try {
    const { user_id, type, amount, description, category, transaction_date } = req.body;
    const error = validateRequired(req.body, ['user_id', 'type', 'amount']);
    if (error) return apiResponse(res, 400, { error });
    if (!['credit', 'debit'].includes(type)) return apiResponse(res, 400, { error: 'Type must be credit or debit.' });
    if (parseFloat(amount) <= 0) return apiResponse(res, 400, { error: 'Amount must be > 0.' });

    const [result] = await pool.execute(
      `INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, type, parseFloat(amount), description || null, category || 'other', transaction_date || getToday(), req.user.id]
    );
    apiResponse(res, 201, { message: 'Transaction recorded.', transaction: { id: result.insertId } });
  } catch (error) { console.error('Add transaction error:', error); apiResponse(res, 500, { error: 'Failed to add transaction.' }); }
};

// Get member balance
const getMemberBalance = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (req.user.role === 'member' && parseInt(userId) !== req.user.id) return apiResponse(res, 403, { error: 'Access denied.' });

    const [result] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_credit, COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as total_debit, COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as balance FROM transactions WHERE user_id = ?`, [userId]);
    const [user] = await pool.execute('SELECT name, email FROM users WHERE id = ?', [userId]);
    apiResponse(res, 200, { member: user[0] || null, financials: result[0] });
  } catch (error) { console.error('Get balance error:', error); apiResponse(res, 500, { error: 'Failed to fetch balance.' }); }
};

// Get overall treasury
const getTreasuryBalance = async (req, res) => {
  try {
    const [overall] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_contributions, COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as total_expenses, COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as treasury_balance, COUNT(*) as total_transactions FROM transactions`);
    const [categories] = await pool.execute(`SELECT category, type, SUM(amount) as total, COUNT(*) as count FROM transactions GROUP BY category, type ORDER BY total DESC`);
    const [topContributors] = await pool.execute(`SELECT u.name, u.id as user_id, SUM(t.amount) as contributed FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.type='credit' GROUP BY u.id, u.name ORDER BY contributed DESC LIMIT 5`);
    apiResponse(res, 200, { treasury: overall[0], categories, topContributors });
  } catch (error) { console.error('Get treasury error:', error); apiResponse(res, 500, { error: 'Failed to fetch treasury.' }); }
};

// Get daily expenses
const getDailyExpenses = async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const [transactions] = await pool.execute(`SELECT t.*, u.name as member_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.transaction_date = ? ORDER BY t.created_at DESC`, [date]);
    const [summary] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as day_credits, COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as day_debits, COUNT(*) as transaction_count FROM transactions WHERE transaction_date = ?`, [date]);
    apiResponse(res, 200, { date, transactions, summary: summary[0] });
  } catch (error) { console.error('Daily expenses error:', error); apiResponse(res, 500, { error: 'Failed to fetch daily expenses.' }); }
};

// Export to CSV
const exportFinance = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let query = `SELECT t.id, u.name as member, t.type, t.amount, t.description, t.category, t.transaction_date FROM transactions t JOIN users u ON t.user_id = u.id WHERE 1=1`;
    const params = [];
    if (date_from) { query += ' AND t.transaction_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND t.transaction_date <= ?'; params.push(date_to); }
    query += ' ORDER BY t.transaction_date DESC';
    const [transactions] = await pool.execute(query, params);
    if (transactions.length === 0) return apiResponse(res, 404, { error: 'No transactions found.' });

    const { Parser } = require('json2csv');
    const csv = new Parser({ fields: ['id', 'member', 'type', 'amount', 'description', 'category', 'transaction_date'] }).parse(transactions);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=jamat_finance.csv`);
    res.send(csv);
  } catch (error) { console.error('Export error:', error); apiResponse(res, 500, { error: 'Export failed.' }); }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return apiResponse(res, 404, { error: 'Not found.' });
    apiResponse(res, 200, { message: 'Transaction deleted.' });
  } catch (error) { console.error('Delete error:', error); apiResponse(res, 500, { error: 'Failed to delete.' }); }
};

module.exports = { getTransactions, addTransaction, getMemberBalance, getTreasuryBalance, getDailyExpenses, exportFinance, deleteTransaction };
