const router = require('express').Router();
const { getTransactions, addTransaction, getMemberBalance, getTreasuryBalance, getDailyExpenses, exportFinance, deleteTransaction } = require('../controllers/financeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/transactions', getTransactions);
router.post('/transactions', authorize('admin', 'accountant'), addTransaction);
router.delete('/transactions/:id', authorize('admin', 'accountant'), deleteTransaction);
router.get('/balance/:userId', getMemberBalance);
router.get('/treasury', authorize('admin', 'accountant'), getTreasuryBalance);
router.get('/daily', getDailyExpenses);
router.get('/export', authorize('admin', 'accountant'), exportFinance);

module.exports = router;
