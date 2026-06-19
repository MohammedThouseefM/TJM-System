/**
 * Enhanced Financial Controller — Full Jamat Finance Module
 * Features: receipt numbers, approval workflow, soft delete, treasury transfers,
 *           planned expenses, audit logging, member/treasury split accounting
 */
const pool = require('../config/db');
const { getPagination, apiResponse, getToday } = require('../utils/helpers');

// ── Helpers ──────────────────────────────────────────────────────
const genReceipt = () => `REC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const fmtDate = (d) => new Date(d).toISOString().split('T')[0];
const audit = async (userId, action, entity, id, details) => {
  try { await pool.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [userId, action, entity, id, JSON.stringify(details)]); } catch {}
};
const getSetting = async (key) => {
  const [r] = await pool.execute('SELECT setting_value FROM jamat_settings WHERE setting_key = ?', [key]);
  return r[0]?.setting_value;
};

// ── GET /finance/transactions ─────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const { user_id, type, category, date_from, date_to, status, source } = req.query;
    const { limit, offset, page } = getPagination(req.query);
    let q = `SELECT t.*, u.name as member_name, c.name as created_by_name,
               a.name as approved_by_name
             FROM transactions t
             JOIN users u ON t.user_id = u.id
             JOIN users c ON t.created_by = c.id
             LEFT JOIN users a ON t.approved_by = a.id
             WHERE t.deleted_at IS NULL`;
    let cq = 'SELECT COUNT(*) as total FROM transactions t WHERE t.deleted_at IS NULL';
    const p = [], cp = [];

    if (req.user.role === 'member') {
      q += ' AND t.user_id = ?'; cq += ' AND t.user_id = ?';
      p.push(req.user.id); cp.push(req.user.id);
    } else if (user_id) {
      q += ' AND t.user_id = ?'; cq += ' AND t.user_id = ?';
      p.push(user_id); cp.push(user_id);
    }
    if (type)      { q += ' AND t.type = ?'; cq += ' AND t.type = ?'; p.push(type); cp.push(type); }
    if (category)  { q += ' AND t.category = ?'; cq += ' AND t.category = ?'; p.push(category); cp.push(category); }
    if (date_from) { q += ' AND t.transaction_date >= ?'; cq += ' AND t.transaction_date >= ?'; p.push(date_from); cp.push(date_from); }
    if (date_to)   { q += ' AND t.transaction_date <= ?'; cq += ' AND t.transaction_date <= ?'; p.push(date_to); cp.push(date_to); }
    if (status)    { q += ' AND t.status = ?'; cq += ' AND t.status = ?'; p.push(status); cp.push(status); }
    if (source)    { q += ' AND t.expense_source = ?'; cq += ' AND t.expense_source = ?'; p.push(source); cp.push(source); }

    const [cnt] = await pool.execute(cq, cp);
    q += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [rows] = await pool.query(q, p);
    apiResponse(res, 200, { transactions: rows, pagination: { page, limit, total: cnt[0].total, totalPages: Math.ceil(cnt[0].total / limit) } });
  } catch(e) { console.error(e); apiResponse(res, 500, { error: 'Failed to fetch transactions.' }); }
};

// ── POST /finance/transactions ────────────────────────────────────
const addTransaction = async (req, res) => {
  try {
    const { user_ids, user_id, type, amount, description, notes, category, transaction_date,
            payment_method, expense_source } = req.body;

    const targetIds = Array.isArray(user_ids) && user_ids.length ? user_ids : user_id ? [user_id] : [];
    if (!targetIds.length) return apiResponse(res, 400, { error: 'At least one member required.' });
    if (!type || !['credit','debit'].includes(type)) return apiResponse(res, 400, { error: 'type must be credit or debit.' });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return apiResponse(res, 400, { error: 'Amount must be > 0.' });

    const txDate = transaction_date || getToday();
    const txCategory = category || (type === 'credit' ? 'contribution' : 'other');
    const txSource = type === 'debit' ? (expense_source || 'treasury') : null;
    const txPayment = payment_method || 'cash';
    const txDesc = description || notes || null;

    // Check approval threshold for debits
    const threshold = parseFloat(await getSetting('approval_threshold') || '500');
    const needsApproval = type === 'debit' && amt >= threshold && req.user.role !== 'admin';
    const txStatus = needsApproval ? 'pending' : 'approved';

    // Check treasury balance if debit from treasury
    if (type === 'debit' && txSource === 'treasury') {
      const [tb] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as bal FROM transactions WHERE expense_source IS NULL OR expense_source = 'treasury' AND deleted_at IS NULL`);
      if (Number(tb[0].bal) < amt * targetIds.length && req.user.role !== 'admin') {
        return apiResponse(res, 400, { error: `Insufficient treasury balance (₹${Number(tb[0].bal).toFixed(2)}).` });
      }
    }

    const created = [];
    for (const uid of targetIds) {
      // Check member balance for member-account debits
      if (type === 'debit' && txSource === 'member') {
        const [mb] = await pool.execute(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0) as bal FROM transactions WHERE user_id = ? AND expense_source = 'member' AND deleted_at IS NULL`, [uid]);
        if (Number(mb[0].bal) < amt && req.user.role !== 'admin') {
          const [u] = await pool.execute('SELECT name FROM users WHERE id = ?', [uid]);
          return apiResponse(res, 400, { error: `Insufficient balance for ${u[0]?.name || 'member'}.` });
        }
      }

      const receipt = type === 'credit' ? genReceipt() : null;
      const [r] = await pool.execute(
        `INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by,
           payment_method, receipt_number, expense_source, status, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid, type, amt, txDesc, txCategory, txDate, req.user.id, txPayment, receipt, txSource, txStatus, txDesc]
      );

      if (needsApproval) {
        await pool.execute(
          'INSERT INTO expense_approvals (transaction_id, requested_by, status, threshold_amount) VALUES (?,?,?,?)',
          [r.insertId, req.user.id, 'pending', threshold]
        );
      }

      await audit(req.user.id, 'CREATE_TRANSACTION', 'transaction', r.insertId, { type, amount: amt, uid, status: txStatus });
      created.push({ id: r.insertId, receipt_number: receipt, status: txStatus });
    }

    apiResponse(res, 201, {
      message: needsApproval
        ? `${created.length} transaction(s) submitted for approval (amount ≥ ₹${threshold}).`
        : `${created.length} transaction(s) recorded.`,
      transactions: created,
      needs_approval: needsApproval
    });
  } catch(e) { console.error(e); apiResponse(res, 500, { error: 'Failed to add transaction.' }); }
};

// ── GET /finance/approvals ────────────────────────────────────────
const getApprovals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ea.*, t.amount, t.description, t.category, t.transaction_date, t.expense_source,
             u.name as requested_by_name, m.name as member_name
      FROM expense_approvals ea
      JOIN transactions t ON ea.transaction_id = t.id
      JOIN users u ON ea.requested_by = u.id
      JOIN users m ON t.user_id = m.id
      WHERE ea.status = 'pending'
      ORDER BY ea.created_at DESC
    `);
    apiResponse(res, 200, { approvals: rows, count: rows.length });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch approvals.' }); }
};

// ── POST /finance/approvals/:id ───────────────────────────────────
const processApproval = async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    if (!['approve','reject'].includes(action)) return apiResponse(res, 400, { error: 'action must be approve or reject.' });

    const [ap] = await pool.execute('SELECT * FROM expense_approvals WHERE id = ? AND status = "pending"', [req.params.id]);
    if (!ap.length) return apiResponse(res, 404, { error: 'Approval not found or already processed.' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.execute('UPDATE expense_approvals SET status=?, approved_by=?, notes=?, updated_at=NOW() WHERE id=?', [newStatus, req.user.id, notes||null, req.params.id]);
    await pool.execute('UPDATE transactions SET status=?, approved_by=? WHERE id=?', [newStatus, req.user.id, ap[0].transaction_id]);

    if (action === 'reject') {
      await pool.execute('UPDATE transactions SET deleted_at=NOW() WHERE id=?', [ap[0].transaction_id]);
    }

    await audit(req.user.id, `${action.toUpperCase()}_EXPENSE`, 'expense_approval', ap[0].id, { transaction_id: ap[0].transaction_id, action });
    apiResponse(res, 200, { message: `Expense ${newStatus} successfully.` });
  } catch(e) { console.error(e); apiResponse(res, 500, { error: 'Failed to process approval.' }); }
};

// ── GET /finance/balance/:userId ─────────────────────────────────
const getMemberBalance = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (req.user.role === 'member' && parseInt(userId) !== req.user.id) return apiResponse(res, 403, { error: 'Access denied.' });
    const [r] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_credit,
        COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as total_debit,
        COALESCE(SUM(CASE WHEN type='credit' THEN amount
                          WHEN type='debit' THEN -amount ELSE 0 END),0) as balance
      FROM transactions WHERE user_id = ? AND deleted_at IS NULL AND status = 'approved'`, [userId]);
    const [u] = await pool.execute('SELECT name, email, role FROM users WHERE id = ?', [userId]);
    const [recent] = await pool.query(
      `SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY transaction_date DESC, created_at DESC LIMIT 10`,
      [userId]
    );
    apiResponse(res, 200, { member: u[0]||null, financials: r[0], recent_transactions: recent });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch balance.' }); }
};

// ── GET /finance/balances ─────────────────────────────────────────
const getAllMembersBalances = async (req, res) => {
  try {
    const lowAlert = parseFloat(await getSetting('low_balance_alert') || '100');
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status,
        COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END),0) as total_credit,
        COALESCE(SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END),0) as total_debit,
        COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount
                          WHEN t.type='debit' THEN -t.amount ELSE 0 END),0) as balance,
        COUNT(t.id) as tx_count
      FROM users u LEFT JOIN transactions t
        ON u.id = t.user_id AND t.deleted_at IS NULL AND t.status = 'approved'
      WHERE u.status = 'active'
      GROUP BY u.id ORDER BY u.name ASC
    `);
    apiResponse(res, 200, { members: rows, low_balance_alert: lowAlert });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch balances.' }); }
};

// ── GET /finance/my-balance ───────────────────────────────────────
const getMyBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const [r] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_credit,
        COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as total_debit,
        COALESCE(SUM(CASE WHEN type='credit' THEN amount
                          WHEN type='debit' THEN -amount ELSE 0 END),0) as balance
      FROM transactions WHERE user_id = ? AND deleted_at IS NULL AND status = 'approved'`, [userId]);
    const [recent] = await pool.query(
      `SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL AND status = 'approved' ORDER BY transaction_date DESC, created_at DESC LIMIT 10`,
      [userId]
    );
    apiResponse(res, 200, { member: { name: req.user.name, email: req.user.email, role: req.user.role }, financials: r[0], recent_transactions: recent });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch balance.' }); }
};

// ── GET /finance/treasury ─────────────────────────────────────────
const getTreasuryBalance = async (req, res) => {
  try {
    const [overall] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_contributions,
        COALESCE(SUM(CASE WHEN type='debit' AND (expense_source='treasury' OR expense_source IS NULL) THEN amount ELSE 0 END),0) as total_expenses,
        COALESCE(SUM(CASE WHEN type='credit' THEN amount
                          WHEN type='debit' AND (expense_source='treasury' OR expense_source IS NULL) THEN -amount ELSE 0 END),0) as treasury_balance,
        COUNT(*) as total_transactions
      FROM transactions WHERE deleted_at IS NULL AND status = 'approved'
    `);
    const [categories] = await pool.execute(`
      SELECT category, type, SUM(amount) as total, COUNT(*) as count
      FROM transactions WHERE deleted_at IS NULL AND status = 'approved'
      GROUP BY category, type ORDER BY total DESC
    `);
    const [topContributors] = await pool.execute(`
      SELECT u.name, u.id as user_id, SUM(t.amount) as contributed
      FROM transactions t JOIN users u ON t.user_id = u.id
      WHERE t.type='credit' AND t.deleted_at IS NULL AND t.status = 'approved'
      GROUP BY u.id, u.name ORDER BY contributed DESC LIMIT 5
    `);
    apiResponse(res, 200, { treasury: overall[0], categories, topContributors });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch treasury.' }); }
};

// ── GET /finance/daily ────────────────────────────────────────────
const getDailyExpenses = async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const [transactions] = await pool.execute(`
      SELECT t.*, u.name as member_name FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.transaction_date = ? AND t.deleted_at IS NULL AND t.status = 'approved'
      ORDER BY t.created_at DESC`, [date]);
    const [summary] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as day_credits,
        COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as day_debits,
        COALESCE(SUM(CASE WHEN type='debit' AND (expense_source='treasury' OR expense_source IS NULL) THEN amount ELSE 0 END),0) as treasury_outflow,
        COALESCE(SUM(CASE WHEN type='debit' AND expense_source='member' THEN amount ELSE 0 END),0) as member_outflow,
        COUNT(*) as transaction_count,
        COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count
      FROM transactions WHERE transaction_date = ? AND deleted_at IS NULL`, [date]);
    apiResponse(res, 200, { date, transactions, summary: summary[0] });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch daily data.' }); }
};

// ── POST /finance/transfer ────────────────────────────────────────
const treasuryTransfer = async (req, res) => {
  try {
    const { direction, member_id, amount, reason } = req.body;
    if (!['to_member','from_member'].includes(direction)) return apiResponse(res, 400, { error: 'Invalid direction.' });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return apiResponse(res, 400, { error: 'Amount must be > 0.' });

    const txDate = getToday();
    // Record as two transactions to maintain ledger integrity
    if (direction === 'to_member') {
      // Treasury -> Member: debit treasury, credit member
      await pool.execute(`INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by, expense_source, status) VALUES (?,?,?,?,?,?,?,?,?)`,
        [member_id, 'debit', amt, `Treasury transfer to member: ${reason||'advance'}`, 'other', txDate, req.user.id, 'treasury', 'approved']);
      await pool.execute(`INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by, expense_source, status) VALUES (?,?,?,?,?,?,?,?,?)`,
        [member_id, 'credit', amt, `Treasury advance received: ${reason||'advance'}`, 'contribution', txDate, req.user.id, 'member', 'approved']);
    } else {
      // Member -> Treasury: debit member, credit treasury (as contribution)
      await pool.execute(`INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by, expense_source, status) VALUES (?,?,?,?,?,?,?,?,?)`,
        [member_id, 'debit', amt, `Transfer to treasury: ${reason||'repayment'}`, 'other', txDate, req.user.id, 'member', 'approved']);
      await pool.execute(`INSERT INTO transactions (user_id, type, amount, description, category, transaction_date, created_by, status) VALUES (?,?,?,?,?,?,?,?)`,
        [member_id, 'credit', amt, `Treasury deposit from member: ${reason||'repayment'}`, 'contribution', txDate, req.user.id, 'approved']);
    }

    await pool.execute('INSERT INTO treasury_transfers (direction, member_id, amount, reason, transfer_date, created_by) VALUES (?,?,?,?,?,?)',
      [direction, member_id, amt, reason||null, txDate, req.user.id]);
    await audit(req.user.id, 'TREASURY_TRANSFER', 'transfer', null, { direction, member_id, amount: amt });
    apiResponse(res, 201, { message: `Transfer of ₹${amt} ${direction === 'to_member' ? 'to member' : 'from member'} completed.` });
  } catch(e) { console.error(e); apiResponse(res, 500, { error: 'Transfer failed.' }); }
};

// ── GET /finance/planned ──────────────────────────────────────────
const getPlannedExpenses = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pe.*, u.name as created_by_name FROM planned_expenses pe
      JOIN users u ON pe.created_by = u.id
      WHERE pe.status = 'pending' ORDER BY pe.planned_date ASC`);
    apiResponse(res, 200, { planned: rows });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch planned expenses.' }); }
};

const addPlannedExpense = async (req, res) => {
  try {
    const { title, amount, planned_date, category, notes } = req.body;
    if (!title || !amount || !planned_date) return apiResponse(res, 400, { error: 'title, amount, planned_date required.' });
    const [r] = await pool.execute(
      'INSERT INTO planned_expenses (title, amount, planned_date, category, notes, created_by) VALUES (?,?,?,?,?,?)',
      [title, parseFloat(amount), planned_date, category||'other', notes||null, req.user.id]
    );
    apiResponse(res, 201, { message: 'Planned expense added.', id: r.insertId });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to add planned expense.' }); }
};

const updatePlannedExpense = async (req, res) => {
  try {
    const { status } = req.body;
    await pool.execute('UPDATE planned_expenses SET status=? WHERE id=?', [status, req.params.id]);
    apiResponse(res, 200, { message: 'Updated.' });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to update.' }); }
};

// ── DELETE /finance/transactions/:id (soft) ───────────────────────
const deleteTransaction = async (req, res) => {
  try {
    const [tx] = await pool.execute('SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!tx.length) return apiResponse(res, 404, { error: 'Transaction not found.' });

    const ageDays = (Date.now() - new Date(tx[0].created_at)) / 86400000;
    if (ageDays > 30 && req.user.role !== 'admin') {
      return apiResponse(res, 403, { error: 'Cannot delete transactions older than 30 days. Contact admin.' });
    }

    await pool.execute('UPDATE transactions SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    await audit(req.user.id, 'DELETE_TRANSACTION', 'transaction', req.params.id, { amount: tx[0].amount, type: tx[0].type });
    apiResponse(res, 200, { message: 'Transaction deleted.' });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to delete.' }); }
};

// ── GET /finance/receipt/:id ──────────────────────────────────────
const getReceipt = async (req, res) => {
  try {
    const [tx] = await pool.query(`
      SELECT t.*, u.name as member_name, u.phone, u.email, c.name as created_by_name
      FROM transactions t JOIN users u ON t.user_id = u.id JOIN users c ON t.created_by = c.id
      WHERE t.id = ? AND t.type = 'credit' AND t.deleted_at IS NULL`, [req.params.id]);
    if (!tx.length) return apiResponse(res, 404, { error: 'Receipt not found.' });
    const jamatName = await getSetting('jamat_name') || 'Tableeghi Jamat';
    apiResponse(res, 200, { receipt: tx[0], jamat_name: jamatName });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch receipt.' }); }
};

// ── GET /finance/export ───────────────────────────────────────────
const exportFinance = async (req, res) => {
  try {
    const { date_from, date_to, user_id } = req.query;
    let q = `SELECT t.id, u.name as member, t.type, t.amount, t.category, t.expense_source,
               t.payment_method, t.receipt_number, t.description, t.transaction_date, t.status
             FROM transactions t JOIN users u ON t.user_id = u.id
             WHERE t.deleted_at IS NULL AND t.status = 'approved'`;
    const p = [];
    if (date_from) { q += ' AND t.transaction_date >= ?'; p.push(date_from); }
    if (date_to)   { q += ' AND t.transaction_date <= ?'; p.push(date_to); }
    if (user_id)   { q += ' AND t.user_id = ?'; p.push(user_id); }
    q += ' ORDER BY t.transaction_date DESC';
    const [rows] = await pool.execute(q, p);
    if (!rows.length) return apiResponse(res, 404, { error: 'No data found.' });
    const { Parser } = require('json2csv');
    const csv = new Parser().parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=jamat_finance.csv');
    res.send(csv);
  } catch(e) { apiResponse(res, 500, { error: 'Export failed.' }); }
};

// ── GET /finance/settings ─────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM jamat_settings');
    const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    apiResponse(res, 200, { settings });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to fetch settings.' }); }
};

const updateSettings = async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await pool.execute('INSERT INTO jamat_settings (setting_key, setting_value, updated_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=?, updated_by=?',
        [key, String(value), req.user.id, String(value), req.user.id]);
    }
    apiResponse(res, 200, { message: 'Settings updated.' });
  } catch(e) { apiResponse(res, 500, { error: 'Failed to update settings.' }); }
};

module.exports = {
  getTransactions, addTransaction, getMemberBalance, getMyBalance, getAllMembersBalances,
  getTreasuryBalance, getDailyExpenses, exportFinance, deleteTransaction,
  getApprovals, processApproval, treasuryTransfer,
  getPlannedExpenses, addPlannedExpense, updatePlannedExpense,
  getReceipt, getSettings, updateSettings
};
